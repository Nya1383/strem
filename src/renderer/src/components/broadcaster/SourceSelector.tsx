import React, { useState, useEffect } from 'react';
import type { DesktopSource } from '../../../../shared/ipc';
import { useStream } from '../../context/StreamContext';

export const SourceSelector: React.FC = () => {
  const { selectedSource, setSelectedSource } = useStream();
  const [sources, setSources] = useState<DesktopSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'screen' | 'window'>('all');

  const fetchSources = async () => {
    setLoading(true);
    try {
      if (window.electronAPI?.getDesktopSources) {
        const fetched = await window.electronAPI.getDesktopSources();
        console.log('[Renderer] Received sources from electronAPI:', fetched);
        setSources(fetched);
        if (!selectedSource && fetched.length > 0) {
          setSelectedSource(fetched[0]);
        }
      } else {
        console.warn('[Renderer] window.electronAPI is not available');
      }
    } catch (err) {
      console.error('Failed to fetch desktop sources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const filteredSources = sources.filter((s) => {
    if (filter === 'screen') return s.id.startsWith('screen');
    if (filter === 'window') return s.id.startsWith('window');
    return true;
  });

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Select Capture Source</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Choose a monitor screen or application window to broadcast over WebRTC
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', background: 'var(--bg-panel)', padding: '3px', borderRadius: '8px' }}>
            <button
              className="btn"
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                background: filter === 'all' ? 'var(--bg-card)' : 'transparent',
                color: filter === 'all' ? '#fff' : 'var(--text-muted)'
              }}
              onClick={() => setFilter('all')}
            >
              All ({sources.length})
            </button>
            <button
              className="btn"
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                background: filter === 'screen' ? 'var(--bg-card)' : 'transparent',
                color: filter === 'screen' ? '#fff' : 'var(--text-muted)'
              }}
              onClick={() => setFilter('screen')}
            >
              Screens
            </button>
            <button
              className="btn"
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                background: filter === 'window' ? 'var(--bg-card)' : 'transparent',
                color: filter === 'window' ? '#fff' : 'var(--text-muted)'
              }}
              onClick={() => setFilter('window')}
            >
              Windows
            </button>
          </div>

          <button className="btn btn-secondary" onClick={fetchSources} disabled={loading} style={{ padding: '8px 12px' }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={loading ? 'pulse' : ''}
            >
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Scanning active displays and windows...
        </div>
      ) : filteredSources.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '15px', color: 'var(--text-main)', fontWeight: 600 }}>No active sources detected</p>
          <p style={{ fontSize: '13px', marginTop: '6px' }}>
            Click "Refresh" above to scan for open windows and displays.
          </p>
          <button className="btn btn-primary" onClick={fetchSources} style={{ marginTop: '16px' }}>
            🔄 Scan Sources
          </button>
        </div>
      ) : (
        <div className="source-grid">
          {filteredSources.map((source) => {
            const isSelected = selectedSource?.id === source.id;
            const isScreen = source.id.startsWith('screen');

            return (
              <div
                key={source.id}
                className={`source-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedSource(source)}
              >
                <img src={source.thumbnail} alt={source.name} className="source-thumb" />
                <div className="source-meta">
                  {source.appIcon && <img src={source.appIcon} width="16" height="16" alt="" />}
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{source.name}</span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: isScreen ? 'var(--accent-primary)' : 'var(--bg-card-hover)',
                      color: '#fff'
                    }}
                  >
                    {isScreen ? 'DISPLAY' : 'APP'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
