import React, { useState, useEffect } from 'react';
import type { WindowControlAction, SignalingServerStatus } from '../../../../shared/ipc';
import { useStream } from '../../context/StreamContext';

export const TitleBar: React.FC = () => {
  const { role, roomId, viewerCount } = useStream();
  const [serverStatus, setServerStatus] = useState<SignalingServerStatus | null>(null);

  useEffect(() => {
    if (window.electronAPI?.getSignalingServerStatus) {
      window.electronAPI.getSignalingServerStatus().then(setServerStatus);
    }
  }, [role]);

  const handleControl = (action: WindowControlAction) => {
    if (window.electronAPI?.windowControl) {
      window.electronAPI.windowControl(action);
    }
  };

  return (
    <div className="titlebar">
      <div className="titlebar-brand">
        <span className="logo-badge">STREM</span>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Desktop Streamer</span>

        {role !== 'idle' && roomId && (
          <div
            className="titlebar-non-drag"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginLeft: '12px',
              padding: '2px 8px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)'
            }}
          >
            <span className="status-dot green"></span>
            <span>{role === 'broadcaster' ? 'LIVE' : 'WATCHING'}</span>
            <span style={{ color: 'var(--text-dim)' }}>|</span>
            <span>ROOM: {roomId}</span>
            <span style={{ color: 'var(--text-dim)' }}>|</span>
            <span>👁 {viewerCount}</span>
          </div>
        )}
      </div>

      <div className="titlebar-controls titlebar-non-drag">
        {serverStatus?.running && (
          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-dim)',
              fontFamily: 'var(--font-mono)',
              marginRight: '8px'
            }}
          >
            WS Port :{serverStatus.port}
          </span>
        )}

        <button className="titlebar-btn" onClick={() => handleControl('minimize')} title="Minimize">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <rect x="2" y="5.5" width="8" height="1" rx="0.5" />
          </svg>
        </button>

        <button className="titlebar-btn" onClick={() => handleControl('maximize')} title="Maximize">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor">
            <rect x="2.5" y="2.5" width="7" height="7" rx="1" strokeWidth="1" />
          </svg>
        </button>

        <button
          className="titlebar-btn close-btn"
          onClick={() => handleControl('close')}
          title="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2.22 2.22a.75.75 0 011.06 0L6 4.94l2.72-2.72a.75.75 0 111.06 1.06L7.06 6l2.72 2.72a.75.75 0 11-1.06 1.06L6 7.06 3.28 9.78a.75.75 0 01-1.06-1.06L4.94 6 2.22 3.28a.75.75 0 010-1.06z" />
          </svg>
        </button>
      </div>
    </div>
  );
};
