import { Tray, Menu, nativeImage, clipboard, app } from 'electron';
import { ProxyManager, ProxyState } from './proxy-manager';
import { isBinaryInstalled, downloadBinary } from './binary-manager';

// Generate a 16x16 PNG tray icon with a colored circle
function createTrayIcon(color: 'green' | 'gray' | 'red'): Electron.NativeImage {
  const size = 16;
  const r = { green: [34, 197, 94], gray: [107, 114, 128], red: [239, 68, 68] }[color];

  // Build a raw RGBA pixel buffer
  const pixels = Buffer.alloc(size * size * 4);
  const cx = 7.5, cy = 7.5, radius = 6;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const i = (y * size + x) * 4;
      if (dist <= radius) {
        // Anti-alias at the edge
        const alpha = Math.min(1, Math.max(0, radius - dist + 0.5));
        pixels[i] = r[0];
        pixels[i + 1] = r[1];
        pixels[i + 2] = r[2];
        pixels[i + 3] = Math.round(alpha * 255);
      }
    }
  }

  return nativeImage.createFromBuffer(pixels, { width: size, height: size });
}

export function createTray(
  proxyManager: ProxyManager,
  onOpenSettings: () => void,
): Tray {
  const tray = new Tray(createTrayIcon('gray'));
  tray.setToolTip('ClankerProxy - Stopped');

  function updateMenu() {
    const state = proxyManager.state;
    const isRunning = state === 'running';
    const isStopped = state === 'stopped' || state === 'error';
    const port = proxyManager.port;

    const statusLabel =
      state === 'running' ? `Running on port ${port}` :
      state === 'starting' ? 'Starting...' :
      state === 'stopping' ? 'Stopping...' :
      state === 'error' ? 'Error (crashed)' :
      'Stopped';

    const menu = Menu.buildFromTemplate([
      { label: 'ClankerProxy', enabled: false },
      { type: 'separator' },
      { label: `Status: ${statusLabel}`, enabled: false },
      { type: 'separator' },
      {
        label: 'Start Proxy',
        enabled: isStopped,
        click: async () => {
          try {
            if (!isBinaryInstalled()) {
              console.log('Downloading binary before start...');
              await downloadBinary();
            }
            await proxyManager.start();
          } catch (err) {
            console.error('Failed to start proxy:', err);
          }
        },
      },
      {
        label: 'Stop Proxy',
        enabled: isRunning,
        click: () => proxyManager.stop().catch(console.error),
      },
      {
        label: 'Restart Proxy',
        enabled: isRunning,
        click: () => proxyManager.restart().catch(console.error),
      },
      { type: 'separator' },
      {
        label: 'Open Settings',
        click: onOpenSettings,
      },
      { type: 'separator' },
      {
        label: 'Copy Proxy URL',
        enabled: isRunning,
        click: () => clipboard.writeText(`http://127.0.0.1:${port}`),
      },
      { type: 'separator' },
      {
        label: 'Start at Login',
        type: 'checkbox',
        checked: app.getLoginItemSettings().openAtLogin,
        click: (item) => {
          app.setLoginItemSettings({ openAtLogin: item.checked });
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          proxyManager.stop().then(() => app.quit());
        },
      },
    ]);

    tray.setContextMenu(menu);

    const iconMap: Record<ProxyState, 'green' | 'gray' | 'red'> = {
      running: 'green',
      starting: 'gray',
      stopping: 'gray',
      stopped: 'gray',
      error: 'red',
    };
    tray.setImage(createTrayIcon(iconMap[state]));
    tray.setToolTip(`ClankerProxy - ${statusLabel}`);
  }

  proxyManager.on('state-change', updateMenu);
  updateMenu();

  // Left-click opens settings on Windows
  tray.on('click', onOpenSettings);

  return tray;
}
