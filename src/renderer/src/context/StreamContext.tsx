import React, { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import type { DesktopSource } from '../../../shared/ipc';
import type { RoomPeer, SignalingState, ServerMessage } from '../../../shared/signaling';
import { SignalingClient } from '../services/signaling/client';
import { BroadcasterPeerManager, ViewerPeerManager } from '../services/webrtc/peerManager';
import { getDesktopMediaStream, getMicrophoneStream, combineAudioStreams } from '../services/webrtc/mediaStream';
import { StatsCollector, type StreamStats } from '../services/stats/statsCollector';
import { StreamRecorder } from '../services/recording/recorder';
import { useSettings } from './SettingsContext';
import { useChat } from './ChatContext';

export type AppRole = 'idle' | 'broadcaster' | 'viewer';

interface StreamContextType {
  role: AppRole;
  signalingState: SignalingState;
  roomId: string | null;
  viewerCount: number;
  peers: RoomPeer[];
  selectedSource: DesktopSource | null;
  localPreviewStream: MediaStream | null;
  remoteStream: MediaStream | null;
  stats: StreamStats | null;
  isMicMuted: boolean;
  isSystemAudioMuted: boolean;
  isRecording: boolean;
  errorMessage: string | null;
  setSelectedSource: (source: DesktopSource | null) => void;
  startBroadcasting: (password?: string, peerName?: string) => Promise<void>;
  stopBroadcasting: () => void;
  joinStream: (roomId: string, password?: string, peerName?: string, customServerUrl?: string) => Promise<void>;
  leaveStream: () => void;
  toggleMicMute: () => void;
  toggleSystemAudioMute: () => void;
  startRecording: () => void;
  stopRecordingAndSave: () => Promise<void>;
  sendChat: (text: string) => void;
  clearError: () => void;
}

const StreamContext = createContext<StreamContextType | null>(null);

export const StreamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  const { addMessage, clearMessages } = useChat();

  const [role, setRole] = useState<AppRole>('idle');
  const [signalingState, setSignalingState] = useState<SignalingState>('idle');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [peers, setPeers] = useState<RoomPeer[]>([]);
  const [selectedSource, setSelectedSource] = useState<DesktopSource | null>(null);
  const [localPreviewStream, setLocalPreviewStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [stats, setStats] = useState<StreamStats | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSystemAudioMuted, setIsSystemAudioMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const signalingClientRef = useRef<SignalingClient>(new SignalingClient(settings.signalingUrl));
  const broadcasterManagerRef = useRef<BroadcasterPeerManager | null>(null);
  const viewerManagerRef = useRef<ViewerPeerManager | null>(null);
  const statsCollectorRef = useRef<StatsCollector>(new StatsCollector());
  const recorderRef = useRef<StreamRecorder>(new StreamRecorder());

  useEffect(() => {
    signalingClientRef.current.setServerUrl(settings.signalingUrl);
  }, [settings.signalingUrl]);

  useEffect(() => {
    const client = signalingClientRef.current;
    const unsubState = client.subscribeState(setSignalingState);

    const unsubMsg = client.subscribe(async (msg: ServerMessage) => {
      switch (msg.type) {
        case 'room-created':
          setRoomId(msg.roomId);
          setRole('broadcaster');

          if (settings.enableDiscordNotifications && window.electronAPI?.sendDiscordNotification) {
            const hasCredentials =
              settings.discordIntegrationType === 'bot'
                ? Boolean(settings.discordBotToken.trim() && settings.discordChannelId.trim())
                : Boolean(settings.discordWebhookUrl.trim());

            if (hasCredentials) {
              window.electronAPI
                .sendDiscordNotification({
                  integrationType: settings.discordIntegrationType,
                  botToken: settings.discordBotToken.trim(),
                  channelId: settings.discordChannelId.trim(),
                  webhookUrl: settings.discordWebhookUrl.trim(),
                  signalingUrl: settings.signalingUrl.trim(),
                  roomId: msg.roomId,
                  sourceName: selectedSource?.name,
                  resolution: settings.resolution,
                  frameRate: settings.frameRate
                })
                .then((res) => {
                  if (res.success) {
                    console.log('[StreamContext] Live alert posted to Discord!');
                  } else {
                    console.warn('[StreamContext] Failed to post alert to Discord:', res.error);
                  }
                })
                .catch((err) => console.warn('[StreamContext] Discord notification exception:', err));
            }
          }
          break;

        case 'room-joined':
          setRoomId(msg.roomId);
          setPeers(msg.peers);
          setRole('viewer');
          break;

        case 'peer-joined':
          setPeers((prev) => [...prev.filter((p) => p.peerId !== msg.peer.peerId), msg.peer]);
          if (role === 'broadcaster' && broadcasterManagerRef.current) {
            try {
              const offer = await broadcasterManagerRef.current.createPeer(msg.peer.peerId);
              client.sendOffer(msg.peer.peerId, offer);
            } catch (err) {
              console.error('Failed to create offer for peer:', msg.peer.peerId, err);
            }
          }
          break;

        case 'peer-left':
          setPeers((prev) => prev.filter((p) => p.peerId !== msg.peerId));
          if (broadcasterManagerRef.current) {
            broadcasterManagerRef.current.closePeer(msg.peerId);
          }
          break;

        case 'offer':
          if (viewerManagerRef.current) {
            try {
              const answer = await viewerManagerRef.current.handleOffer(msg.fromPeerId, msg.sdp);
              client.sendAnswer(msg.fromPeerId, answer);

              const pc = viewerManagerRef.current.getPeerConnection();
              if (pc) {
                statsCollectorRef.current.start(pc);
              }
            } catch (err) {
              console.error('Failed to handle offer:', err);
            }
          }
          break;

        case 'answer':
          if (broadcasterManagerRef.current) {
            await broadcasterManagerRef.current.handleAnswer(msg.fromPeerId, msg.sdp);
            const pc = broadcasterManagerRef.current.getPeer(msg.fromPeerId);
            if (pc) {
              statsCollectorRef.current.start(pc);
            }
          }
          break;

        case 'ice-candidate':
          if (role === 'broadcaster' && broadcasterManagerRef.current) {
            await broadcasterManagerRef.current.addIceCandidate(msg.fromPeerId, msg.candidate);
          } else if (role === 'viewer' && viewerManagerRef.current) {
            await viewerManagerRef.current.addIceCandidate(msg.candidate);
          }
          break;

        case 'viewer-count':
          setViewerCount(msg.count);
          break;

        case 'chat':
          addMessage(msg.message);
          break;

        case 'error':
          setErrorMessage(msg.message);
          break;

        case 'kick':
          setErrorMessage(`Disconnected: ${msg.reason}`);
          cleanupStream();
          break;
      }
    });

    const unsubStats = statsCollectorRef.current.subscribe(setStats);

    return () => {
      unsubState();
      unsubMsg();
      unsubStats();
    };
  }, [role, selectedSource, settings]);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let isMounted = true;

    async function loadPreview() {
      if (!selectedSource) {
        if (localPreviewStream) {
          localPreviewStream.getTracks().forEach((t) => t.stop());
          setLocalPreviewStream(null);
        }
        return;
      }

      try {
        const resDimensions =
          settings.resolution === '1440p'
            ? { width: 2560, height: 1440 }
            : settings.resolution === '720p'
              ? { width: 1280, height: 720 }
              : { width: 1920, height: 1080 };

        const desktopStream = await getDesktopMediaStream(selectedSource.id, {
          width: resDimensions.width,
          height: resDimensions.height,
          frameRate: settings.frameRate,
          includeSystemAudio: !isSystemAudioMuted
        });

        let micStream: MediaStream | undefined;
        if (settings.micDeviceId && !isMicMuted) {
          try {
            micStream = await getMicrophoneStream(settings.micDeviceId);
          } catch (micErr) {
            console.warn('Microphone capture failed:', micErr);
          }
        }

        const audioMix = combineAudioStreams(desktopStream, micStream);
        const finalStream = new MediaStream();

        desktopStream.getVideoTracks().forEach((vt) => finalStream.addTrack(vt));

        if (audioMix) {
          audioMix.mixedStream.getAudioTracks().forEach((at) => finalStream.addTrack(at));
        } else if (desktopStream.getAudioTracks().length > 0) {
          desktopStream.getAudioTracks().forEach((at) => finalStream.addTrack(at));
        }

        if (isMounted) {
          activeStream = finalStream;
          setLocalPreviewStream(finalStream);
          if (broadcasterManagerRef.current) {
            broadcasterManagerRef.current.setLocalStream(finalStream);
          }
        }
      } catch (err) {
        console.error('Failed to get desktop preview stream:', err);
        setErrorMessage('Failed to capture selected display source');
      }
    }

    loadPreview();

    return () => {
      isMounted = false;
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [selectedSource, settings.resolution, settings.frameRate, settings.micDeviceId]);

  const startBroadcasting = async (password?: string, peerName?: string) => {
    if (!selectedSource || !localPreviewStream) {
      setErrorMessage('Please select a monitor or window to stream first');
      return;
    }

    setErrorMessage(null);
    clearMessages();

    broadcasterManagerRef.current = new BroadcasterPeerManager((targetPeerId, candidate) => {
      signalingClientRef.current.sendIceCandidate(targetPeerId, candidate);
    });
    broadcasterManagerRef.current.setLocalStream(localPreviewStream);

    try {
      await signalingClientRef.current.connect();
      signalingClientRef.current.createRoom(password, peerName);
    } catch (err) {
      setErrorMessage('Failed to connect to signaling server');
    }
  };

  const stopBroadcasting = () => {
    cleanupStream();
  };

  const joinStream = async (
    targetRoomId: string,
    password?: string,
    peerName?: string,
    customServerUrl?: string
  ) => {
    if (!targetRoomId.trim()) {
      setErrorMessage('Please enter a valid Stream Room ID');
      return;
    }

    setErrorMessage(null);
    clearMessages();

    if (customServerUrl) {
      console.log('[StreamContext] Connecting to custom signaling server URL:', customServerUrl);
      signalingClientRef.current.setServerUrl(customServerUrl);
    } else {
      signalingClientRef.current.setServerUrl(settings.signalingUrl);
    }

    viewerManagerRef.current = new ViewerPeerManager(
      (broadcasterPeerId, candidate) => {
        signalingClientRef.current.sendIceCandidate(broadcasterPeerId, candidate);
      },
      (remoteMediaStream) => {
        setRemoteStream(remoteMediaStream);
      }
    );

    try {
      await signalingClientRef.current.connect();
      signalingClientRef.current.joinRoom(targetRoomId, password, peerName);
    } catch (err) {
      setErrorMessage('Failed to connect to signaling server');
    }
  };

  const leaveStream = () => {
    cleanupStream();
  };

  const cleanupStream = () => {
    signalingClientRef.current.disconnect();
    if (broadcasterManagerRef.current) {
      broadcasterManagerRef.current.closeAll();
      broadcasterManagerRef.current = null;
    }
    if (viewerManagerRef.current) {
      viewerManagerRef.current.close();
      viewerManagerRef.current = null;
    }
    statsCollectorRef.current.stop();
    setRole('idle');
    setRoomId(null);
    setViewerCount(0);
    setPeers([]);
    setRemoteStream(null);
    setStats(null);
  };

  const toggleMicMute = () => {
    setIsMicMuted((prev) => !prev);
    if (localPreviewStream) {
      localPreviewStream.getAudioTracks().forEach((track) => {
        track.enabled = isMicMuted;
      });
    }
  };

  const toggleSystemAudioMute = () => {
    setIsSystemAudioMuted((prev) => !prev);
  };

  const startRecording = () => {
    const targetStream = role === 'broadcaster' ? localPreviewStream : remoteStream;
    if (!targetStream) return;

    recorderRef.current.start(targetStream);
    setIsRecording(true);
  };

  const stopRecordingAndSave = async () => {
    setIsRecording(false);
    await recorderRef.current.saveToFile(`strem-${role}-${Date.now()}.webm`);
  };

  const sendChat = (text: string) => {
    if (text.trim()) {
      signalingClientRef.current.sendChat(text.trim());
    }
  };

  const clearError = () => setErrorMessage(null);

  return (
    <StreamContext.Provider
      value={{
        role,
        signalingState,
        roomId,
        viewerCount,
        peers,
        selectedSource,
        localPreviewStream,
        remoteStream,
        stats,
        isMicMuted,
        isSystemAudioMuted,
        isRecording,
        errorMessage,
        setSelectedSource,
        startBroadcasting,
        stopBroadcasting,
        joinStream,
        leaveStream,
        toggleMicMute,
        toggleSystemAudioMute,
        startRecording,
        stopRecordingAndSave,
        sendChat,
        clearError
      }}
    >
      {children}
    </StreamContext.Provider>
  );
};

export const useStream = (): StreamContextType => {
  const context = useContext(StreamContext);
  if (!context) {
    throw new Error('useStream must be used within a StreamProvider');
  }
  return context;
};
