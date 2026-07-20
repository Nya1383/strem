export interface DesktopStreamOptions {
  width?: number;
  height?: number;
  frameRate?: number;
  includeSystemAudio?: boolean;
}

export async function getDesktopMediaStream(
  sourceId: string,
  options: DesktopStreamOptions = {}
): Promise<MediaStream> {
  const width = options.width || 1920;
  const height = options.height || 1080;
  const frameRate = options.frameRate || 60;
  const includeSystemAudio = options.includeSystemAudio ?? true;

  const videoConstraints: any = {
    mandatory: {
      chromeMediaSource: 'desktop',
      chromeMediaSourceId: sourceId,
      minWidth: width,
      maxWidth: width,
      minHeight: height,
      maxHeight: height,
      maxFrameRate: frameRate,
      minFrameRate: Math.min(30, frameRate)
    }
  };

  const audioConstraints: any = includeSystemAudio
    ? {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId
        }
      }
    : false;

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: audioConstraints,
    video: videoConstraints
  });

  return stream;
}

export async function getMicrophoneStream(deviceId?: string): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    audio: deviceId ? { deviceId: { exact: deviceId } } : true,
    video: false
  };

  return await navigator.mediaDevices.getUserMedia(constraints);
}

export async function getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === 'audioinput');
}

/**
 * Mixes desktop system audio and microphone audio into a single output audio track
 * using Web Audio API.
 */
export function combineAudioStreams(
  systemAudioStream?: MediaStream,
  micStream?: MediaStream
): { mixedStream: MediaStream; audioContext: AudioContext } | null {
  const audioContext = new AudioContext();
  const destination = audioContext.createMediaStreamDestination();
  let hasAudio = false;

  if (systemAudioStream && systemAudioStream.getAudioTracks().length > 0) {
    const systemSource = audioContext.createMediaStreamSource(systemAudioStream);
    const systemGain = audioContext.createGain();
    systemGain.gain.value = 1.0;
    systemSource.connect(systemGain);
    systemGain.connect(destination);
    hasAudio = true;
  }

  if (micStream && micStream.getAudioTracks().length > 0) {
    const micSource = audioContext.createMediaStreamSource(micStream);
    const micGain = audioContext.createGain();
    micGain.gain.value = 1.0;
    micSource.connect(micGain);
    micGain.connect(destination);
    hasAudio = true;
  }

  if (!hasAudio) {
    audioContext.close();
    return null;
  }

  return {
    mixedStream: destination.stream,
    audioContext
  };
}
