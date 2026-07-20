import React from 'react';
import { useStream } from '../../context/StreamContext';

export const StatsHUD: React.FC = () => {
  const { stats } = useStream();

  if (!stats) return null;

  const qualityDotColor =
    stats.quality === 'excellent'
      ? 'green'
      : stats.quality === 'good'
        ? 'green'
        : stats.quality === 'fair'
          ? 'amber'
          : 'red';

  return (
    <div className="hud-overlay" style={{ gap: '8px', flexWrap: 'wrap', maxWidth: '800px' }}>
      <div className="hud-badge">
        <span className={`status-dot ${qualityDotColor}`} />
        <span>{stats.quality.toUpperCase()}</span>
      </div>

      <div className="hud-badge">
        <span style={{ color: 'var(--text-muted)' }}>LATENCY:</span>
        <span style={{ color: 'var(--accent-cyan)' }}>{stats.rttMs} ms</span>
      </div>

      <div className="hud-badge">
        <span style={{ color: 'var(--text-muted)' }}>BITRATE:</span>
        <span>{(stats.bitrateKbps / 1000).toFixed(2)} Mbps</span>
      </div>

      <div className="hud-badge">
        <span style={{ color: 'var(--text-muted)' }}>FPS:</span>
        <span>{stats.fps}</span>
      </div>

      <div className="hud-badge">
        <span style={{ color: 'var(--text-muted)' }}>RES:</span>
        <span>{stats.resolution}</span>
      </div>

      <div className="hud-badge">
        <span style={{ color: 'var(--text-muted)' }}>CODEC:</span>
        <span>{stats.codec}</span>
      </div>

      <div className="hud-badge">
        <span style={{ color: 'var(--text-muted)' }}>LOSS:</span>
        <span style={{ color: stats.packetLossPercentage > 2 ? 'var(--status-red)' : 'inherit' }}>
          {stats.packetLossPercentage}%
        </span>
      </div>
    </div>
  );
};
