import { app, BrowserWindow, shell } from 'electron';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { registerDesktopCapturerHandlers } from './ipc/desktopCapturer';
import { registerAppWindowHandlers } from './ipc/appWindow';
import { signalingServer } from './signaling/server';
import { IPC_CHANNELS } from '../shared/ipc';

let mainWindow: BrowserWindow | null = null;

// Register custom protocol handler for strem://
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('strem', process.execPath, [resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('strem');
}

// Single instance lock to catch protocol launches when app is already open
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      // Find strem:// URL in command line arguments
      const urlArg = commandLine.find((arg) => arg.startsWith('strem://'));
      if (urlArg) {
        const roomId = extractRoomIdFromUrl(urlArg);
        if (roomId) {
          console.log('[Main] Protocol link clicked while running! Joining room:', roomId);
          mainWindow.webContents.send(IPC_CHANNELS.DEEP_LINK_JOIN_ROOM, roomId);
        }
      }
    }
  });
}

function extractRoomIdFromUrl(rawUrl: string): string | null {
  try {
    const cleaned = rawUrl.trim();
    if (cleaned.startsWith('strem://join/')) {
      return cleaned.replace('strem://join/', '').split('?')[0].split('/')[0].toLowerCase();
    }
    if (cleaned.startsWith('strem://')) {
      return cleaned.replace('strem://', '').split('?')[0].split('/')[0].toLowerCase();
    }
  } catch (err) {
    console.error('[Main] Failed to parse protocol URL:', err);
  }
  return null;
}

function getPreloadPath(): string {
  const mjsPath = join(__dirname, '../preload/index.mjs');
  const jsPath = join(__dirname, '../preload/index.js');
  if (existsSync(mjsPath)) return mjsPath;
  if (existsSync(jsPath)) return jsPath;
  return mjsPath;
}

function createWindow(): void {
  const preload = getPreloadPath();
  console.log('[Main] Using preload script path:', preload);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    frame: false,
    backgroundColor: '#090a0f',
    autoHideMenuBar: true,
    webPreferences: {
      preload,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();

    // Check cold launch command line arguments for strem:// URL
    const urlArg = process.argv.find((arg) => arg.startsWith('strem://'));
    if (urlArg) {
      const roomId = extractRoomIdFromUrl(urlArg);
      if (roomId) {
        console.log('[Main] Cold launch with protocol link! Joining room:', roomId);
        setTimeout(() => {
          mainWindow?.webContents.send(IPC_CHANNELS.DEEP_LINK_JOIN_ROOM, roomId);
        }, 1000);
      }
    }
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(async () => {
  registerDesktopCapturerHandlers();
  registerAppWindowHandlers();

  try {
    await signalingServer.start(8080);
  } catch (err) {
    console.warn('[Main] Signaling server default port 8080 in use or failed:', err);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  signalingServer.stop();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
