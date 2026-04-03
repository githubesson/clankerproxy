import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { appendFileSync } from 'fs';
import { ProxyManager } from './proxy-manager';
import { createTray } from './tray';
import { registerIPCHandlers } from './ipc-handlers';
import { isBinaryInstalled, downloadBinary } from './binary-manager';
import { store } from './store';

// Crash logging
const logFile = join(app.getPath('userData'), 'clankerproxy.log');
function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { appendFileSync(logFile, line); } catch {}
  console.log(msg);
}
process.on('uncaughtException', (err) => { log(`UNCAUGHT: ${err.stack ?? err}`); });
process.on('unhandledRejection', (err) => { log(`UNHANDLED: ${err}`); });

// Handle Squirrel install/update/uninstall events on Windows.
if (process.platform === 'win32' && process.argv[1]?.startsWith('--squirrel-')) {
  app.quit();
}

const proxyManager = new ProxyManager();
let settingsWindow: BrowserWindow | null = null;
let isQuitting = false;

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  const bounds = store.get('windowBounds');

  settingsWindow = new BrowserWindow({
    width: bounds?.width ?? 720,
    height: bounds?.height ?? 480,
    x: bounds?.x,
    y: bounds?.y,
    minWidth: 560,
    minHeight: 380,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#09090b',
      symbolColor: '#a1a1aa',
      height: 30,
    },
    backgroundColor: '#09090b',
    webPreferences: {
      preload: join(__dirname, `preload.js`),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const loadURL = MAIN_WINDOW_VITE_DEV_SERVER_URL ?? '';
  const loadFile = join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
  log(`DEV_SERVER_URL: ${MAIN_WINDOW_VITE_DEV_SERVER_URL}`);
  log(`VITE_NAME: ${MAIN_WINDOW_VITE_NAME}`);
  log(`loadFile path: ${loadFile}`);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    settingsWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    settingsWindow.loadFile(loadFile);
  }

  settingsWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    log(`Renderer failed to load: ${code} ${desc}`);
  });

  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.webContents.setZoomFactor(store.get('zoom'));
    settingsWindow?.show();
  });

  settingsWindow.on('close', (e) => {
    if (settingsWindow) {
      const b = settingsWindow.getBounds();
      store.set('windowBounds', { x: b.x, y: b.y, width: b.width, height: b.height });
    }
    if (!isQuitting) {
      e.preventDefault();
      settingsWindow?.hide();
    }
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// Forward proxy events to renderer
proxyManager.on('state-change', (state: string) => {
  settingsWindow?.webContents.send('proxy:stateChanged', state);
});

proxyManager.on('log', (lines: string[]) => {
  settingsWindow?.webContents.send('proxy:log', lines);
});

app.on('ready', async () => {
  log(`App ready. userData: ${app.getPath('userData')}`);
  log(`__dirname: ${__dirname}`);
  registerIPCHandlers(proxyManager);
  createTray(proxyManager, createSettingsWindow);
  createSettingsWindow(); // Always open on startup for debugging

  // Auto-download binary if not installed
  if (!isBinaryInstalled()) {
    console.log('Binary not found, downloading latest from GitHub...');
    try {
      await downloadBinary();
      console.log('Binary downloaded successfully');
    } catch (err) {
      console.error('Failed to download binary:', err);
      createSettingsWindow(); // Open settings so user can retry manually
      return;
    }
  }

  // Auto-start proxy
  if (store.get('autoStartProxy')) {
    proxyManager.start().catch(console.error);
  }
});

// Keep the app running when all windows are closed (tray app behavior)
app.on('window-all-closed', () => {
  // Do nothing — the tray keeps the app alive
});

app.on('before-quit', async () => {
  isQuitting = true;
  await proxyManager.stop();
});
