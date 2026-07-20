/// <reference types="vite/client" />
import type { DesktopSource, SignalingServerStatus, WindowControlAction, DiscordNotificationPayload } from '../shared/ipc';

export interface ElectronAPI {
  getDesktopSources: () => Promise<DesktopSource[]>;
  startSignalingServer: (port?: number) => Promise<SignalingServerStatus>;
  stopSignalingServer: () => Promise<SignalingServerStatus>;
  getSignalingServerStatus: () => Promise<SignalingServerStatus>;
  windowControl: (action: WindowControlAction) => void;
  copyToClipboard: (text: string) => Promise<boolean>;
  saveRecording: (
    arrayBuffer: ArrayBuffer,
    defaultFilename: string
  ) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  sendDiscordNotification: (
    payload: DiscordNotificationPayload
  ) => Promise<{ success: boolean; error?: string }>;
  testDiscordWebhook: (
    webhookUrl: string
  ) => Promise<{ success: boolean; error?: string }>;
  testDiscordBotCredentials: (
    botToken: string,
    channelId: string
  ) => Promise<{ success: boolean; error?: string }>;
  onDeepLinkJoinRoom: (callback: (roomId: string) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
