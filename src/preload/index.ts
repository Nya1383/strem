import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type WindowControlAction, type DiscordNotificationPayload } from '../shared/ipc';
import type { DeepLinkPayload } from '../types/env';

const api = {
  getDesktopSources: () => ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_CAPTURER_GET_SOURCES),
  startSignalingServer: (port?: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.SIGNALING_START_SERVER, port),
  stopSignalingServer: () => ipcRenderer.invoke(IPC_CHANNELS.SIGNALING_STOP_SERVER),
  getSignalingServerStatus: () => ipcRenderer.invoke(IPC_CHANNELS.SIGNALING_GET_STATUS),
  windowControl: (action: WindowControlAction) =>
    ipcRenderer.send(IPC_CHANNELS.APP_WINDOW_CONTROL, action),
  copyToClipboard: (text: string) => ipcRenderer.invoke(IPC_CHANNELS.CLIPBOARD_COPY, text),
  saveRecording: (arrayBuffer: ArrayBuffer, defaultFilename: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_RECORDING, arrayBuffer, defaultFilename),
  sendDiscordNotification: (payload: DiscordNotificationPayload) =>
    ipcRenderer.invoke(IPC_CHANNELS.DISCORD_SEND_NOTIFICATION, payload),
  testDiscordWebhook: (webhookUrl: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.DISCORD_TEST_WEBHOOK, webhookUrl),
  testDiscordBotCredentials: (botToken: string, channelId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.DISCORD_TEST_BOT_CREDENTIALS, botToken, channelId),
  onDeepLinkJoinRoom: (callback: (data: DeepLinkPayload) => void) => {
    const handler = (_event: any, data: DeepLinkPayload) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.DEEP_LINK_JOIN_ROOM, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.DEEP_LINK_JOIN_ROOM, handler);
    };
  }
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', api);
  } catch (error) {
    console.error('[Preload] Failed to expose electronAPI:', error);
  }
} else {
  // @ts-ignore
  window.electronAPI = api;
}
