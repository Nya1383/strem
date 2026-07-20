import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useStream } from '../../context/StreamContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const { roomId } = useStream();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const joinLink = roomId ? `strem://${roomId}` : '';

  useEffect(() => {
    if (isOpen && roomId) {
      QRCode.toDataURL(joinLink, { width: 220, margin: 2, color: { dark: '#ffffff', light: '#0d0f17' } })
        .then(setQrDataUrl)
        .catch(console.error);
    }
  }, [isOpen, roomId, joinLink]);

  if (!isOpen || !roomId) return null;

  const handleCopy = () => {
    if (window.electronAPI?.copyToClipboard) {
      window.electronAPI.copyToClipboard(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{ width: '100%', maxWidth: '420px', padding: '24px', position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Stream Share & QR Code</h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          {qrDataUrl ? (
            <div style={{ padding: '12px', background: '#0d0f17', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <img src={qrDataUrl} alt="Room QR Code" width="200" height="200" />
            </div>
          ) : (
            <div style={{ width: '200px', height: '200px', background: 'var(--bg-panel)', borderRadius: '16px' }} />
          )}

          <div style={{ width: '100%', textAlign: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>STREAM ROOM ID</span>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '4px',
                color: 'var(--accent-cyan)',
                margin: '6px 0'
              }}
            >
              {roomId}
            </div>
          </div>

          <button className="btn btn-primary" onClick={handleCopy} style={{ width: '100%' }}>
            {copied ? '✓ Copied Room ID to Clipboard!' : '📋 Copy Stream Room ID'}
          </button>
        </div>
      </div>
    </div>
  );
};
