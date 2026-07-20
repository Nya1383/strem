import React, { useRef, useEffect, useState } from 'react';
import { useStream } from '../../context/StreamContext';
import { useSettings } from '../../context/SettingsContext';

interface StreamPreviewProps {
  onOpenShareModal: () => void;
}

export const StreamPreview: React.FC<StreamPreviewProps> = ({ onOpenShareModal }) => {
  const {
    role,
    roomId,
    selectedSource,
    localPreviewStream,
    isMicMuted,
    isSystemAudioMuted,
    isRecording,
    toggleMicMute,
    toggleSystemAudioMute,
    startBroadcasting,
    stopBroadcasting,
    startRecording,
    stopRecordingAndSave
  } = useStream();

  const { settings } = useSettings();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [passwordInput, setPasswordInput] = useState('');

  useEffect(() => {
    if (videoRef.current && localPreviewStream) {
      videoRef.current.srcObject = localPreviewStream;
    }
  }, [localPreviewStream]);

  const handleTakeScreenshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1920;
    canvas.height = videoRef.current.videoHeight || 1080;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `strem-screenshot-${Date.now()}.png`;
      a.click();
    }
  };

  const isBroadcasting = role === 'broadcaster';

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Stream Studio & Preview</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {selectedSource ? `Selected: ${selectedSource.name}` : 'No source selected'}
          </p>
        </div>

        {isBroadcasting && (
          <button className="btn btn-secondary" onClick={onOpenShareModal} style={{ gap: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
            </svg>
            Share Stream & QR Code
          </button>
        )}
      </div>

      <div className="video-container" style={{ minHeight: '380px' }}>
        {localPreviewStream ? (
          <video ref={videoRef} autoPlay playsInline muted className="video-element" />
        ) : (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
            Select a screen or window source below to generate a preview
          </div>
        )}

        <div className="hud-overlay">
          <div className="hud-badge">
            <span className={`status-dot ${isBroadcasting ? 'green' : 'amber'}`} />
            {isBroadcasting ? 'LIVE BROADCAST' : 'PREVIEW'}
          </div>

          <div className="hud-badge">
            <span>{settings.resolution} @ {settings.frameRate}FPS</span>
          </div>

          <div className="hud-badge">
            <span>{settings.preferredCodec}</span>
          </div>

          {isRecording && (
            <div className="hud-badge" style={{ color: 'var(--status-red)', borderColor: 'var(--status-red)' }}>
              <span className="status-dot red pulse" />
              REC
            </div>
          )}
        </div>

        {localPreviewStream && (
          <div className="video-controls">
            <button
              className={`btn ${isMicMuted ? 'btn-danger' : 'btn-secondary'}`}
              onClick={toggleMicMute}
              title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              style={{ padding: '8px 12px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
              </svg>
            </button>

            <button
              className={`btn ${isSystemAudioMuted ? 'btn-danger' : 'btn-secondary'}`}
              onClick={toggleSystemAudioMute}
              title={isSystemAudioMuted ? 'Enable System Audio' : 'Mute System Audio'}
              style={{ padding: '8px 12px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
              </svg>
            </button>

            <button
              className={`btn ${isRecording ? 'btn-danger' : 'btn-secondary'}`}
              onClick={isRecording ? stopRecordingAndSave : startRecording}
              title={isRecording ? 'Stop & Save Recording' : 'Record Stream'}
              style={{ padding: '8px 12px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={isRecording ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="8" />
              </svg>
            </button>

            <button
              className="btn btn-secondary"
              onClick={handleTakeScreenshot}
              title="Take High-Res Snapshot"
              style={{ padding: '8px 12px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>

            <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }} />

            {!isBroadcasting ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="password"
                  placeholder="Room Password (Optional)"
                  className="input-field"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  style={{ width: '180px', padding: '6px 10px', fontSize: '12px' }}
                />
                <button
                  className="btn btn-primary pulse"
                  onClick={() => startBroadcasting(passwordInput || undefined)}
                >
                  🚀 Start Stream
                </button>
              </div>
            ) : (
              <button className="btn btn-danger" onClick={stopBroadcasting}>
                🛑 Stop Stream ({roomId})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
