import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type VideoResolution = '720p' | '1080p' | '1440p';
export type FrameRate = 30 | 60;
export type VideoCodec = 'H264' | 'VP9';
export type DiscordIntegrationType = 'bot' | 'webhook';

export interface AppSettings {
  resolution: VideoResolution;
  frameRate: FrameRate;
  maxBitrateMbps: number;
  preferredCodec: VideoCodec;
  signalingUrl: string;
  pushToTalkKey: string;
  enablePushToTalk: boolean;
  micDeviceId: string;
  discordIntegrationType: DiscordIntegrationType;
  discordBotToken: string;
  discordChannelId: string;
  discordWebhookUrl: string;
  enableDiscordNotifications: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  resolution: '1080p',
  frameRate: 60,
  maxBitrateMbps: 8,
  preferredCodec: 'H264',
  signalingUrl: 'ws://localhost:8080',
  pushToTalkKey: 'Space',
  enablePushToTalk: false,
  micDeviceId: '',
  discordIntegrationType: 'bot',
  discordBotToken: '',
  discordChannelId: '',
  discordWebhookUrl: '',
  enableDiscordNotifications: true
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('strem_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('strem_settings', JSON.stringify(settings));
    } catch (err) {
      console.error('Failed to save settings to localStorage:', err);
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
