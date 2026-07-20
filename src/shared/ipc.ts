/**
 * IPC channel names and message payload types exchanged between
 * Main process, Preload script, and Renderer process.
 */

export const IPC_CHANNELS = {
  // Desktop capturer
  DESKTOP_CAPTURER_GET_SOURCES: 'desktop-capturer:get-sources',

  // Embedded signaling server management
  SIGNALING_START_SERVER: 'signaling:start-server',
  SIGNALING_STOP_SERVER: 'signaling:stop-server',
  SIGNALING_GET_STATUS: 'signaling:get-status',

  // Window control
  APP_WINDOW_CONTROL: 'app-window:control',

  // Utilities
  CLIPBOARD_COPY: 'utility:clipboard-copy',
  SAVE_RECORDING: 'utility:save-recording',

  // Discord integration
  DISCORD_SEND_NOTIFICATION: 'discord:send-notification',
  DISCORD_TEST_WEBHOOK: 'discord:test-webhook',
  DISCORD_TEST_BOT_CREDENTIALS: 'discord:test-bot-credentials',

  // Deep linking
  DEEP_LINK_JOIN_ROOM: 'deep-link:join-room'
} as const;

export type WindowControlAction = 'minimize' | 'maximize' | 'restore' | 'close' | 'toggle-fullscreen';

export interface DesktopSource {
  id: string;
  name: string;
  thumbnail: string;
  appIcon?: string;
  display_id: string;
}

export interface SignalingServerStatus {
  running: boolean;
  port: number;
  activeRooms: number;
  activeClients: number;
}

export interface DiscordNotificationPayload {
  integrationType: 'bot' | 'webhook';
  webhookUrl?: string;
  botToken?: string;
  channelId?: string;
  signalingUrl?: string;
  roomId: string;
  password?: string;
  sourceName?: string;
  resolution?: string;
  frameRate?: number;
}
