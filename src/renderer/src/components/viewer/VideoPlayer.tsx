import React, { useRef, useEffect, useState } from 'react';
import { useStream } from '../../context/StreamContext';
import { StatsHUD } from '../common/StatsHUD';

export const VideoPlayer: React.FC = () => {
  const { remoteStream, roomId, leaveStream, isRecording, startRecording, stopRecordingAndSave } = useStream();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [showStats, setShowStats] = useState(true);

  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      if (val === 0) setIsMuted(true);
      else if (isMuted) setIsMuted(false);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  const handleScreenshot = () => {
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
      a.download = `strem-snapshot-${roomId}-${Date.now()}.png`;
      a.click();
    }
  };

  const togglePiP = async () => {
    if (videoRef.current && document.pictureInPictureEnabled) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.current.requestPictureInPicture();
        }
      } catch (err) {
        console.error('PiP failed:', err);
      }
    }
  };

  return (
    <div ref={containerRef} className="video-container">
      <video ref={videoRef} autoPlay playsInline className="video-element" />

      {showStats && <StatsHUD />}

      <div className="video-controls">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={toggleMute} style={{ padding: '8px 12px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isMuted || volume === 0 ? (
                <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
              ) : (
                <>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
                </>
              )}
            </svg>
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            style={{ width: '80px', accentColor: 'var(--accent-primary)' }}
          />
        </div>

        <button
          className={`btn ${showStats ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setShowStats(!showStats)}
          title="Toggle Stream Statistics"
          style={{ padding: '8px 12px' }}
        >
          📊 Stats
        </button>

        <button
          className={`btn ${isRecording ? 'btn-danger' : 'btn-secondary'}`}
          onClick={isRecording ? stopRecordingAndSave : startRecording}
          title={isRecording ? 'Stop Recording' : 'Record Stream'}
          style={{ padding: '8px 12px' }}
        >
          🔴 {isRecording ? 'REC' : 'Record'}
        </button>

        <button className="btn btn-secondary" onClick={handleScreenshot} title="Snapshot" style={{ padding: '8px 12px' }}>
          📸
        </button>

        <button className="btn btn-secondary" onClick={togglePiP} title="Picture in Picture" style={{ padding: '8px 12px' }}>
          🖼️
        </button>

        <button className="btn btn-secondary" onClick={toggleFullscreen} title="Fullscreen" style={{ padding: '8px 12px' }}>
          ⛶
        </button>

        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }} />

        <button className="btn btn-danger" onClick={leaveStream}>
          Disconnect
        </button>
      </div>
    </div>
  );
};
