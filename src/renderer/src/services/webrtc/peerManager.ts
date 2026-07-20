import type { IceCandidatePayload } from '../../../../shared/signaling';

export const DEFAULT_RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export function preferH264Codec(sdp: string): string {
  const lines = sdp.split('\r\n');
  const mVideoIndex = lines.findIndex((l) => l.startsWith('m=video'));
  if (mVideoIndex === -1) return sdp;

  const mVideoLine = lines[mVideoIndex];
  const parts = mVideoLine.split(' ');
  if (parts.length < 4) return sdp;

  const header = parts.slice(0, 3);
  const payloadTypes = parts.slice(3);

  const h264Payloads: string[] = [];
  for (let i = mVideoIndex + 1; i < lines.length; i++) {
    if (lines[i].startsWith('m=')) break;
    const match = lines[i].match(/^a=rtpmap:(\d+)\s+H264\/90000/i);
    if (match) {
      h264Payloads.push(match[1]);
    }
  }

  if (h264Payloads.length === 0) return sdp;

  const remainingPayloads = payloadTypes.filter((pt) => !h264Payloads.includes(pt));
  const newPayloads = [...h264Payloads, ...remainingPayloads];
  lines[mVideoIndex] = [...header, ...newPayloads].join(' ');

  return lines.join('\r\n');
}

export type OnIceCandidateCallback = (targetPeerId: string, candidate: IceCandidatePayload) => void;
export type OnRemoteTrackCallback = (stream: MediaStream) => void;

export class BroadcasterPeerManager {
  private peers = new Map<string, RTCPeerConnection>();
  private localStream: MediaStream | null = null;
  private onIceCandidate: OnIceCandidateCallback;
  private config: RTCConfiguration;

  constructor(onIceCandidate: OnIceCandidateCallback, config = DEFAULT_RTC_CONFIG) {
    this.onIceCandidate = onIceCandidate;
    this.config = config;
  }

  public setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
    for (const pc of this.peers.values()) {
      const senders = pc.getSenders();
      for (const sender of senders) {
        pc.removeTrack(sender);
      }
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }
    }
  }

  public async createPeer(viewerPeerId: string): Promise<RTCSessionDescriptionInit> {
    this.closePeer(viewerPeerId);

    const pc = new RTCPeerConnection(this.config);
    this.peers.set(viewerPeerId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.onIceCandidate(viewerPeerId, {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          usernameFragment: event.candidate.usernameFragment ?? null
        });
      }
    };

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track, this.localStream);
      }
    }

    const offer = await pc.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false
    });

    const modifiedSdp = preferH264Codec(offer.sdp || '');
    const modifiedOffer: RTCSessionDescriptionInit = { type: 'offer', sdp: modifiedSdp };

    await pc.setLocalDescription(modifiedOffer);
    return modifiedOffer;
  }

  public async handleAnswer(viewerPeerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peers.get(viewerPeerId);
    if (!pc) {
      console.warn(`[BroadcasterPeerManager] No peer connection for viewer ${viewerPeerId}`);
      return;
    }
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  public async addIceCandidate(viewerPeerId: string, candidate: IceCandidatePayload): Promise<void> {
    const pc = this.peers.get(viewerPeerId);
    if (!pc) return;

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate as RTCIceCandidateInit));
    } catch (err) {
      console.error(`[BroadcasterPeerManager] Failed to add ICE candidate for ${viewerPeerId}:`, err);
    }
  }

  public closePeer(viewerPeerId: string): void {
    const pc = this.peers.get(viewerPeerId);
    if (pc) {
      pc.close();
      this.peers.delete(viewerPeerId);
    }
  }

  public getPeer(viewerPeerId: string): RTCPeerConnection | undefined {
    return this.peers.get(viewerPeerId);
  }

  public closeAll(): void {
    for (const pc of this.peers.values()) {
      pc.close();
    }
    this.peers.clear();
  }
}

export class ViewerPeerManager {
  private pc: RTCPeerConnection | null = null;
  private broadcasterPeerId: string | null = null;
  private onIceCandidate: OnIceCandidateCallback;
  private onRemoteTrack: OnRemoteTrackCallback;
  private config: RTCConfiguration;
  private remoteStream = new MediaStream();

  constructor(
    onIceCandidate: OnIceCandidateCallback,
    onRemoteTrack: OnRemoteTrackCallback,
    config = DEFAULT_RTC_CONFIG
  ) {
    this.onIceCandidate = onIceCandidate;
    this.onRemoteTrack = onRemoteTrack;
    this.config = config;
  }

  public async handleOffer(
    broadcasterPeerId: string,
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> {
    this.close();
    this.broadcasterPeerId = broadcasterPeerId;

    const pc = new RTCPeerConnection(this.config);
    this.pc = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && this.broadcasterPeerId) {
        this.onIceCandidate(this.broadcasterPeerId, {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          usernameFragment: event.candidate.usernameFragment ?? null
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('[ViewerPeerManager] Remote track received:', event.track.kind);
      this.remoteStream.addTrack(event.track);
      this.onRemoteTrack(this.remoteStream);
    };

    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await pc.createAnswer();
    const modifiedSdp = preferH264Codec(answer.sdp || '');
    const modifiedAnswer: RTCSessionDescriptionInit = { type: 'answer', sdp: modifiedSdp };

    await pc.setLocalDescription(modifiedAnswer);
    return modifiedAnswer;
  }

  public async addIceCandidate(candidate: IceCandidatePayload): Promise<void> {
    if (!this.pc) return;
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate as RTCIceCandidateInit));
    } catch (err) {
      console.error('[ViewerPeerManager] Failed to add ICE candidate:', err);
    }
  }

  public getPeerConnection(): RTCPeerConnection | null {
    return this.pc;
  }

  public close(): void {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.broadcasterPeerId = null;
    this.remoteStream = new MediaStream();
  }
}
