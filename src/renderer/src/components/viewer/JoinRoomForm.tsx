import React, { useState } from 'react';
import { useStream } from '../../context/StreamContext';

export const JoinRoomForm: React.FC = () => {
  const { joinStream, signalingState, errorMessage } = useStream();
  const [roomIdInput, setRoomIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [peerNameInput, setPeerNameInput] = useState('');

  const isConnecting = signalingState === 'connecting';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomIdInput.trim()) {
      joinStream(roomIdInput.trim(), passwordInput || undefined, peerNameInput || undefined);
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        maxWidth: '480px',
        width: '100%',
        margin: '40px auto',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Join Desktop Stream</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Enter a 6-character Stream Room ID to connect instantly via WebRTC
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            STREAM ROOM ID *
          </label>
          <input
            type="text"
            placeholder="e.g. x7k9p2"
            className="input-field"
            value={roomIdInput}
            onChange={(e) => setRoomIdInput(e.target.value)}
            style={{ fontSize: '18px', fontFamily: 'var(--font-mono)', textTransform: 'lowercase', letterSpacing: '2px' }}
            required
            autoFocus
          />
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            ROOM PASSWORD (IF REQUIRED)
          </label>
          <input
            type="password"
            placeholder="Enter password..."
            className="input-field"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
          />
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            YOUR DISPLAY NAME (OPTIONAL)
          </label>
          <input
            type="text"
            placeholder="Viewer"
            className="input-field"
            value={peerNameInput}
            onChange={(e) => setPeerNameInput(e.target.value)}
          />
        </div>

        {errorMessage && (
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid var(--status-red)',
              borderRadius: '8px',
              color: 'var(--status-red)',
              fontSize: '13px'
            }}
          >
            ⚠️ {errorMessage}
          </div>
        )}

        <button type="submit" className="btn btn-primary pulse" disabled={isConnecting} style={{ marginTop: '8px', padding: '14px' }}>
          {isConnecting ? 'Connecting to Stream...' : '📺 Watch Stream'}
        </button>
      </form>
    </div>
  );
};
