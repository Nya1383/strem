import { ipcMain, BrowserWindow, clipboard, dialog } from 'electron';
import * as fs from 'node:fs/promises';
import {
  IPC_CHANNELS,
  type WindowControlAction,
  type SignalingServerStatus,
  type DiscordNotificationPayload
} from '../../shared/ipc';
import { signalingServer } from '../signaling/server';
import {
  sendDiscordStreamNotification,
  testDiscordWebhookUrl,
  testDiscordBotCredentials
} from '../services/discordNotifier';

export function registerAppWindowHandlers(): void {
  // Window controls
  ipcMain.on(IPC_CHANNELS.APP_WINDOW_CONTROL, (event, action: WindowControlAction) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return;

    switch (action) {
      case 'minimize':
        window.minimize();
        break;
      case 'maximize':
        if (window.isMaximized()) {
          window.unmaximize();
        } else {
          window.maximize();
        }
        break;
      case 'restore':
        window.restore();
        break;
      case 'close':
        window.close();
        break;
      case 'toggle-fullscreen':
        window.setFullScreen(!window.isFullScreen());
        break;
    }
  });

  // Signaling server control
  ipcMain.handle(IPC_CHANNELS.SIGNALING_START_SERVER, async (_event, port?: number) => {
    const targetPort = port || 8080;
    try {
      await signalingServer.start(targetPort);
      return signalingServer.getStatus();
    } catch (err) {
      console.error('[IPC] Failed to start signaling server:', err);
      return signalingServer.getStatus();
    }
  });

  ipcMain.handle(IPC_CHANNELS.SIGNALING_STOP_SERVER, async () => {
    await signalingServer.stop();
    return signalingServer.getStatus();
  });

  ipcMain.handle(IPC_CHANNELS.SIGNALING_GET_STATUS, (): SignalingServerStatus => {
    return signalingServer.getStatus();
  });

  // Clipboard utility
  ipcMain.handle(IPC_CHANNELS.CLIPBOARD_COPY, (_event, text: string) => {
    clipboard.writeText(text);
    return true;
  });

  // Recording saver
  ipcMain.handle(
    IPC_CHANNELS.SAVE_RECORDING,
    async (event, arrayBuffer: ArrayBuffer, defaultFilename: string) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      const { canceled, filePath } = await dialog.showSaveDialog(window || (undefined as any), {
        title: 'Save Stream Recording',
        defaultPath: defaultFilename || `strem-recording-${Date.now()}.webm`,
        filters: [{ name: 'WebM Video', extensions: ['webm'] }, { name: 'All Files', extensions: ['*'] }]
      });

      if (canceled || !filePath) {
        return { success: false };
      }

      try {
        const buffer = Buffer.from(arrayBuffer);
        await fs.writeFile(filePath, buffer);
        return { success: true, filePath };
      } catch (err) {
        console.error('[IPC] Save recording error:', err);
        return { success: false, error: String(err) };
      }
    }
  );

  // Discord integration
  ipcMain.handle(IPC_CHANNELS.DISCORD_SEND_NOTIFICATION, async (_event, payload: DiscordNotificationPayload) => {
    return await sendDiscordStreamNotification(payload);
  });

  ipcMain.handle(IPC_CHANNELS.DISCORD_TEST_WEBHOOK, async (_event, webhookUrl: string) => {
    return await testDiscordWebhookUrl(webhookUrl);
  });

  ipcMain.handle(
    IPC_CHANNELS.DISCORD_TEST_BOT_CREDENTIALS,
    async (_event, botToken: string, channelId: string) => {
      return await testDiscordBotCredentials(botToken, channelId);
    }
  );
}
