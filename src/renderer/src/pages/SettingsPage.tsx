import React, { useState, useEffect } from 'react';
import { useSettings, type VideoResolution, type FrameRate, type VideoCodec } from '../context/SettingsContext';
import { getAudioInputDevices } from '../services/webrtc/mediaStream';
import type { SignalingServerStatus } from '../../../shared/ipc';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [serverStatus, setServerStatus] = useState<SignalingServerStatus | null>(null);
  const [testStatus, setTestStatus] = useState<{ testing: boolean; message?: string; error?: boolean }>({ testing: false });

  useEffect(() => {
    getAudioInputDevices().then(setMicDevices).catch(console.error);

    if (window.electronAPI?.getSignalingServerStatus) {
      window.electronAPI.getSignalingServerStatus().then(setServerStatus);
    }
  }, []);

  const handleToggleServer = async () => {
    if (!window.electronAPI) return;
    if (serverStatus?.running) {
      const updated = await window.electronAPI.stopSignalingServer();
      setServerStatus(updated);
    } else {
      const updated = await window.electronAPI.startSignalingServer(8080);
      setServerStatus(updated);
    }
  };

  const handleTestDiscordBot = async () => {
    if (!settings.discordBotToken.trim() || !settings.discordChannelId.trim()) {
      setTestStatus({ testing: false, error: true, message: 'Please enter both your Discord Bot Token and Channel ID.' });
      return;
    }

    setTestStatus({ testing: true, message: 'Testing Discord Bot credentials...' });
    if (window.electronAPI?.testDiscordBotCredentials) {
      const result = await window.electronAPI.testDiscordBotCredentials(
        settings.discordBotToken.trim(),
        settings.discordChannelId.trim()
      );
      if (result.success) {
        setTestStatus({ testing: false, error: false, message: '✓ Bot test message successfully posted to your Discord channel!' });
      } else {
        setTestStatus({ testing: false, error: true, message: `❌ Discord Bot test failed: ${result.error || 'Unknown error'}` });
      }
    }
  };

  const handleTestDiscordWebhook = async () => {
    if (!settings.discordWebhookUrl.trim()) {
      setTestStatus({ testing: false, error: true, message: 'Please paste a valid Discord Webhook URL.' });
      return;
    }

    setTestStatus({ testing: true, message: 'Testing Discord Webhook connection...' });
    if (window.electronAPI?.testDiscordWebhook) {
      const result = await window.electronAPI.testDiscordWebhook(settings.discordWebhookUrl.trim());
      if (result.success) {
        setTestStatus({ testing: false, error: false, message: '✓ Webhook test message successfully posted to your Discord channel!' });
      } else {
        setTestStatus({ testing: false, error: true, message: `❌ Discord test failed: ${result.error || 'Unknown error'}` });
      }
    }
  };

  return (
    <div style={{ flex: 1, padding: '32px', overflowY: 'auto', maxWidth: '800px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800 }}>STREM Preferences & Integrations</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Customize video encoding, audio inputs, Discord Bot stream alerts, and signaling server
          </p>
        </div>

        {/* Discord Auto Stream Alert Integration */}
        <div style={{ padding: '20px', background: 'var(--bg-panel)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#5865F2', fontSize: '18px' }}>🤖</span>
                Discord Bot Auto-Stream Alerts
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Automatically post clickable stream watch links to your Discord text channel when you go live
              </p>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={settings.enableDiscordNotifications}
                onChange={(e) => updateSettings({ enableDiscordNotifications: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
              />
              Enabled
            </label>
          </div>

          {/* Mode Switcher */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <button
              className="btn"
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                background: settings.discordIntegrationType === 'bot' ? 'var(--accent-primary)' : 'var(--bg-card)',
                color: '#fff'
              }}
              onClick={() => updateSettings({ discordIntegrationType: 'bot' })}
            >
              🤖 Discord Bot Token & Channel ID
            </button>
            <button
              className="btn"
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                background: settings.discordIntegrationType === 'webhook' ? 'var(--accent-primary)' : 'var(--bg-card)',
                color: '#fff'
              }}
              onClick={() => updateSettings({ discordIntegrationType: 'webhook' })}
            >
              🔗 Discord Webhook URL
            </button>
          </div>

          {settings.discordIntegrationType === 'bot' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  DISCORD BOT TOKEN *
                </label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Paste your Discord Bot Token here..."
                  value={settings.discordBotToken}
                  onChange={(e) => updateSettings({ discordBotToken: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  DISCORD CHANNEL ID *
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. 123456789012345678"
                    value={settings.discordChannelId}
                    onChange={(e) => updateSettings({ discordChannelId: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleTestDiscordBot}
                    disabled={testStatus.testing}
                    style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}
                  >
                    {testStatus.testing ? 'Testing...' : 'Test Bot'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                DISCORD WEBHOOK URL
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="https://discord.com/api/webhooks/123456789/abcdef..."
                  value={settings.discordWebhookUrl}
                  onChange={(e) => updateSettings({ discordWebhookUrl: e.target.value })}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleTestDiscordWebhook}
                  disabled={testStatus.testing}
                  style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}
                >
                  {testStatus.testing ? 'Testing...' : 'Test Webhook'}
                </button>
              </div>
            </div>
          )}

          {testStatus.message && (
            <div
              style={{
                fontSize: '12px',
                padding: '10px 14px',
                borderRadius: '8px',
                marginTop: '12px',
                background: testStatus.error ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                color: testStatus.error ? 'var(--status-red)' : 'var(--status-green)'
              }}
            >
              {testStatus.message}
            </div>
          )}
        </div>

        {/* Embedded Signaling Server Control */}
        <div style={{ padding: '20px', background: 'var(--bg-panel)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                Embedded WebSocket Signaling Server
                <span className={`status-dot ${serverStatus?.running ? 'green' : 'red'}`} />
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {serverStatus?.running
                  ? `Active on ws://localhost:${serverStatus.port} (${serverStatus.activeRooms} rooms, ${serverStatus.activeClients} peers)`
                  : 'Embedded server is stopped'}
              </p>
            </div>

            <button
              className={`btn ${serverStatus?.running ? 'btn-danger' : 'btn-primary'}`}
              onClick={handleToggleServer}
            >
              {serverStatus?.running ? 'Stop Server' : 'Start Server'}
            </button>
          </div>
        </div>

        {/* Video Quality Settings */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--accent-primary)' }}>
            Video Encoding Settings
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                STREAM RESOLUTION
              </label>
              <select
                className="input-field"
                value={settings.resolution}
                onChange={(e) => updateSettings({ resolution: e.target.value as VideoResolution })}
              >
                <option value="720p">720p HD (1280x720)</option>
                <option value="1080p">1080p Full HD (1920x1080)</option>
                <option value="1440p">1440p QHD (2560x1440)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                TARGET FRAME RATE
              </label>
              <select
                className="input-field"
                value={settings.frameRate}
                onChange={(e) => updateSettings({ frameRate: Number(e.target.value) as FrameRate })}
              >
                <option value={30}>30 FPS</option>
                <option value={60}>60 FPS (Ultra Smooth)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                PREFERRED VIDEO CODEC
              </label>
              <select
                className="input-field"
                value={settings.preferredCodec}
                onChange={(e) => updateSettings({ preferredCodec: e.target.value as VideoCodec })}
              >
                <option value="H264">H.264 (Hardware Accelerated)</option>
                <option value="VP9">VP9 (High Quality Software Fallback)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                MAX BITRATE: {settings.maxBitrateMbps} Mbps
              </label>
              <input
                type="range"
                min="1"
                max="15"
                step="1"
                value={settings.maxBitrateMbps}
                onChange={(e) => updateSettings({ maxBitrateMbps: Number(e.target.value) })}
                style={{ width: '100%', marginTop: '8px', accentColor: 'var(--accent-primary)' }}
              />
            </div>
          </div>
        </div>

        {/* Audio Input Settings */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--accent-primary)' }}>
            Audio Configuration
          </h3>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              MICROPHONE DEVICE
            </label>
            <select
              className="input-field"
              value={settings.micDeviceId}
              onChange={(e) => updateSettings({ micDeviceId: e.target.value })}
            >
              <option value="">Default Microphone</option>
              {micDevices.map((dev) => (
                <option key={dev.deviceId} value={dev.deviceId}>
                  {dev.label || `Microphone ${dev.deviceId.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Signaling Network URL */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--accent-primary)' }}>
            Network & Signaling
          </h3>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              SIGNALING SERVER URL
            </label>
            <input
              type="text"
              className="input-field"
              value={settings.signalingUrl}
              onChange={(e) => updateSettings({ signalingUrl: e.target.value })}
              placeholder="ws://localhost:8080"
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <button className="btn btn-secondary" onClick={resetSettings}>
            Reset Default Settings
          </button>
        </div>
      </div>
    </div>
  );
};
