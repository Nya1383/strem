export type QualityTier = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

export interface StreamStats {
  bitrateKbps: number;
  fps: number;
  rttMs: number;
  packetLossPercentage: number;
  resolution: string;
  codec: string;
  quality: QualityTier;
  bytesTransferred: number;
  framesDropped: number;
}

export type StatsListener = (stats: StreamStats) => void;

export class StatsCollector {
  private timer: NodeJS.Timeout | null = null;
  private prevBytes = 0;
  private prevFrames = 0;
  private prevTimestamp = 0;
  private prevPacketsLost = 0;
  private prevPacketsTotal = 0;
  private listeners: Set<StatsListener> = new Set();

  public start(pc: RTCPeerConnection, intervalMs = 1000): void {
    this.stop();
    this.timer = setInterval(async () => {
      try {
        const stats = await this.collect(pc);
        for (const listener of this.listeners) {
          listener(stats);
        }
      } catch (err) {
        console.error('[StatsCollector] Error polling stats:', err);
      }
    }, intervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.prevBytes = 0;
    this.prevFrames = 0;
    this.prevTimestamp = 0;
    this.prevPacketsLost = 0;
    this.prevPacketsTotal = 0;
  }

  public subscribe(listener: StatsListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async collect(pc: RTCPeerConnection): Promise<StreamStats> {
    const rawReport = await pc.getStats();
    let bytes = 0;
    let frames = 0;
    let rttMs = 0;
    let packetsLost = 0;
    let packetsReceived = 0;
    let resolution = '1920x1080';
    let codec = 'H264';
    let framesDropped = 0;

    const now = Date.now();
    const timeDeltaSec = this.prevTimestamp ? (now - this.prevTimestamp) / 1000 : 1;
    this.prevTimestamp = now;

    rawReport.forEach((report) => {
      // Inbound RTP (Viewer receiving video)
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        bytes = report.bytesReceived || 0;
        frames = report.framesDecoded || 0;
        packetsLost = report.packetsLost || 0;
        packetsReceived = report.packetsReceived || 0;
        framesDropped = report.framesDropped || 0;
        if (report.frameWidth && report.frameHeight) {
          resolution = `${report.frameWidth}x${report.frameHeight}`;
        }
      }

      // Outbound RTP (Broadcaster sending video)
      if (report.type === 'outbound-rtp' && report.kind === 'video') {
        bytes = report.bytesSent || 0;
        frames = report.framesEncoded || 0;
        if (report.frameWidth && report.frameHeight) {
          resolution = `${report.frameWidth}x${report.frameHeight}`;
        }
      }

      // Candidate pair for latency (RTT)
      if (report.type === 'candidate-pair' && report.state === 'in-use') {
        if (typeof report.currentRoundTripTime === 'number') {
          rttMs = Math.round(report.currentRoundTripTime * 1000);
        }
      }

      // Codec details
      if (report.type === 'codec' && report.mimeType) {
        codec = report.mimeType.replace('video/', '').toUpperCase();
      }
    });

    const byteDelta = Math.max(0, bytes - this.prevBytes);
    this.prevBytes = bytes;
    const bitrateKbps = Math.round((byteDelta * 8) / (timeDeltaSec * 1000));

    const frameDelta = Math.max(0, frames - this.prevFrames);
    this.prevFrames = frames;
    const fps = Math.round(frameDelta / timeDeltaSec);

    const lostDelta = Math.max(0, packetsLost - this.prevPacketsLost);
    const recvDelta = Math.max(0, packetsReceived - this.prevPacketsTotal);
    this.prevPacketsLost = packetsLost;
    this.prevPacketsTotal = packetsReceived;

    const totalPacketsDelta = lostDelta + recvDelta;
    const packetLossPercentage =
      totalPacketsDelta > 0 ? Number(((lostDelta / totalPacketsDelta) * 100).toFixed(1)) : 0;

    const quality = this.calculateQuality(rttMs, packetLossPercentage, fps);

    return {
      bitrateKbps,
      fps,
      rttMs,
      packetLossPercentage,
      resolution,
      codec,
      quality,
      bytesTransferred: bytes,
      framesDropped
    };
  }

  private calculateQuality(rttMs: number, lossPercent: number, fps: number): QualityTier {
    if (rttMs === 0 && lossPercent === 0 && fps === 0) return 'unknown';
    if (rttMs <= 80 && lossPercent < 1.0 && fps >= 50) return 'excellent';
    if (rttMs <= 180 && lossPercent < 3.0 && fps >= 25) return 'good';
    if (rttMs <= 300 && lossPercent < 7.0) return 'fair';
    return 'poor';
  }
}
