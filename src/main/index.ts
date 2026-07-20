import { app, BrowserWindow, shell } from 'electron';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { registerDesktopCapturerHandlers } from './ipc/desktopCapturer';
import { registerAppWindowHandlers } from './ipc/appWindow';
import { signalingServer } from './signaling/server';
import { IPC_CHANNELS } from '../shared/ipc';

let mainWindow: BrowserWindow | null = null;

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('strem', process.execPath, [resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('strem');
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      const urlArg = commandLine.find((arg) => arg.startsWith('strem://'));
      if (urlArg) {
        const parsed = parseDeepLinkUrl(urlArg);
        if (parsed.roomId) {
          console.log('[Main] Protocol link clicked! Room:', parsed.roomId, 'Server:', parsed.serverUrl);
          mainWindow.webContents.send(IPC_CHANNELS.DEEP_LINK_JOIN_ROOM, parsed);
        }
      }
    }
  });
}

export interface ParsedDeepLink {
  roomId: string;
  serverUrl?: string;
}

function parseDeepLinkUrl(rawUrl: string): ParsedDeepLink {
  try {
    const cleaned = rawUrl.trim();
    let pathPart = cleaned;
    if (cleaned.startsWith('strem://join/')) {
      pathPart = cleaned.replace('strem://join/', '');
    } else if (cleaned.startsWith('strem://')) {
      pathPart = cleaned.replace('strem://', '');
    }

    const [roomAndPath, queryString] = pathPart.split('?');
    const roomId = roomAndPath.split('/')[0].toLowerCase();

    let serverUrl: string | undefined = undefined;
    if (queryString) {
      const params = new URLSearchParams(queryString);
      const serverParam = params.get('server');
      if (serverParam) {
        serverUrl = decodeURIComponent(serverParam);
      }
    }

    return { roomId, serverUrl };
  } catch (err) {
    console.error('[Main] Failed to parse protocol URL:', err);
    return { roomId: '' };
  }
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

    const urlArg = process.argv.find((arg) => arg.startsWith('strem://'));
    if (urlArg) {
      const parsed = parseDeepLinkUrl(urlArg);
      if (parsed.roomId) {
        console.log('[Main] Cold launch protocol link! Room:', parsed.roomId, 'Server:', parsed.serverUrl);
        setTimeout(() => {
          mainWindow?.webContents.send(IPC_CHANNELS.DEEP_LINK_JOIN_ROOM, parsed);
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
