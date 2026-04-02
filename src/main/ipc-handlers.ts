import { ipcMain, shell, BrowserWindow } from 'electron';
import { ProxyManager } from './proxy-manager';
import { downloadBinary, getLatestRelease, checkForUpdate, isBinaryInstalled, type ReleaseInfo } from './binary-manager';
import { store } from './store';

export function registerIPCHandlers(proxyManager: ProxyManager) {
  // Proxy lifecycle
  ipcMain.handle('proxy:getStatus', () => ({
    state: proxyManager.state,
    port: proxyManager.port,
    binaryInstalled: isBinaryInstalled(),
  }));

  ipcMain.handle('proxy:start', async () => {
    await proxyManager.start();
  });

  ipcMain.handle('proxy:stop', async () => {
    await proxyManager.stop();
  });

  ipcMain.handle('proxy:restart', async () => {
    await proxyManager.restart();
  });

  ipcMain.handle('proxy:getLogs', () => proxyManager.logs);

  // Binary management
  ipcMain.handle('binary:getLatestRelease', async () => {
    return getLatestRelease();
  });

  ipcMain.handle('binary:checkForUpdate', async () => {
    return checkForUpdate();
  });

  ipcMain.handle('binary:download', async (_, release?: ReleaseInfo) => {
    return downloadBinary(release);
  });

  ipcMain.handle('binary:isInstalled', () => isBinaryInstalled());

  ipcMain.handle('binary:currentVersion', () => store.get('binaryVersion'));

  // Management API passthrough (only works when proxy is running)
  function requireClient() {
    const client = proxyManager.client;
    if (!client) throw new Error('Proxy is not running');
    return client;
  }

  // Config
  ipcMain.handle('config:get', () => requireClient().getConfig());
  ipcMain.handle('config:getYAML', () => requireClient().getConfigYAML());
  ipcMain.handle('config:putYAML', (_, yaml: string) => requireClient().putConfigYAML(yaml));
  ipcMain.handle('config:updateField', (_, field: string, value: any) => requireClient().updateConfigField(field, value));

  // API Keys
  ipcMain.handle('apiKeys:list', () => requireClient().getAPIKeys());
  ipcMain.handle('apiKeys:add', (_, key: string) => requireClient().addAPIKey(key));
  ipcMain.handle('apiKeys:delete', (_, index: number) => requireClient().deleteAPIKey(index));

  // Provider Keys
  ipcMain.handle('providerKeys:list', (_, provider: string) => requireClient().getProviderKeys(provider));
  ipcMain.handle('providerKeys:patch', (_, provider: string, body: any) => requireClient().patchProviderKeys(provider, body));
  ipcMain.handle('providerKeys:delete', (_, provider: string, index: number) => requireClient().deleteProviderKey(provider, index));

  // Auth Files
  ipcMain.handle('authFiles:list', () => requireClient().getAuthFiles());
  ipcMain.handle('authFiles:delete', (_, name: string) => requireClient().deleteAuthFile(name));
  ipcMain.handle('authFiles:toggle', (_, name: string, disabled: boolean) => requireClient().toggleAuthFile(name, disabled));
  ipcMain.handle('authFiles:patchFields', (_, name: string, fields: Record<string, any>) => requireClient().patchAuthFileFields(name, fields));

  // OAuth
  ipcMain.handle('oauth:startLogin', async (_, provider: string) => {
    const result = await requireClient().startOAuth(provider);
    // Open the OAuth URL in the default browser
    shell.openExternal(result.url);
    return result;
  });
  ipcMain.handle('oauth:getStatus', (_, state: string) => requireClient().getAuthStatus(state));

  // Logs (from management API)
  ipcMain.handle('logs:get', (_, after: number, limit: number) => requireClient().getLogs(after, limit));

  // Usage
  ipcMain.handle('usage:get', () => requireClient().getUsage());

  // Models
  ipcMain.handle('models:get', (_, channel: string) => requireClient().getModelDefinitions(channel));

  // Preferences
  ipcMain.handle('prefs:get', (_, key: string) => store.get(key as any));
  ipcMain.handle('prefs:set', (_, key: string, value: any) => store.set(key as any, value));

  // Zoom
  ipcMain.handle('zoom:get', () => store.get('zoom'));
  ipcMain.handle('zoom:set', (event, factor: number) => {
    const clamped = Math.round(Math.max(0.6, Math.min(1.6, factor)) * 100) / 100;
    store.set('zoom', clamped);
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.webContents.setZoomFactor(clamped);
    return clamped;
  });
}
