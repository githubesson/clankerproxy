import os from 'os';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { downloadBinary, getLatestRelease, checkForUpdate, isBinaryInstalled, type ReleaseInfo } from './binary-manager';
import { ProxyManager } from './proxy-manager';
import { store } from './store';
import { IPC_CHANNELS } from '../shared/ipc';
import { appLogger } from './app-logger';
import { checkForAppUpdate } from './app-updater';
import { fetchModelsDevCatalog } from './models-dev';
import { registerModelsDevPresetSnapshot } from './models-dev-preset-updater';
import { UsageRecorder } from './usage-recorder';

export function registerIPCHandlers(proxyManager: ProxyManager, usageRecorder: UsageRecorder) {
  const requireClient = () => {
    const client = proxyManager.client;
    if (!client) throw new Error('Proxy is not running');
    return client;
  };

  const handle = <TArgs extends unknown[], TResult>(
    channel: string,
    handler: (...args: TArgs) => TResult | Promise<TResult>,
  ) => {
    ipcMain.handle(channel, (_event, ...args) => handler(...(args as TArgs)));
  };

  const handleClient = <TArgs extends unknown[], TResult>(
    channel: string,
    handler: (client: ReturnType<typeof requireClient>, ...args: TArgs) => TResult | Promise<TResult>,
  ) => {
    handle(channel, (...args: TArgs) => handler(requireClient(), ...args));
  };

  handle(IPC_CHANNELS.proxy.getStatus, () => ({
    state: proxyManager.state,
    port: proxyManager.port,
    binaryInstalled: isBinaryInstalled(),
  }));
  handle(IPC_CHANNELS.proxy.start, () => proxyManager.start());
  handle(IPC_CHANNELS.proxy.stop, () => proxyManager.stop());
  handle(IPC_CHANNELS.proxy.restart, () => proxyManager.restart());
  handle(IPC_CHANNELS.proxy.getLogs, () => proxyManager.logs);

  handle(IPC_CHANNELS.binary.getLatestRelease, () => getLatestRelease());
  handle(IPC_CHANNELS.binary.checkForUpdate, () => checkForUpdate());
  handle(IPC_CHANNELS.binary.download, async (release?: ReleaseInfo) => {
    const wasRunning = proxyManager.state === 'running';
    const binaryPath = await downloadBinary(release);

    if (wasRunning) {
      appLogger.log('[binary] Updated engine installed; restarting running proxy to load the new binary.');
      await proxyManager.restart();
      appLogger.log('[binary] Proxy restarted on updated engine.');
    }

    return binaryPath;
  });
  handle(IPC_CHANNELS.binary.isInstalled, () => isBinaryInstalled());
  handle(IPC_CHANNELS.binary.currentVersion, () => store.get('binaryVersion'));

  handleClient(IPC_CHANNELS.config.get, (client) => client.getConfig());
  handleClient(IPC_CHANNELS.config.getYAML, (client) => client.getConfigYAML());
  handleClient(IPC_CHANNELS.config.putYAML, (client, yaml: string) => client.putConfigYAML(yaml));
  handleClient(IPC_CHANNELS.config.updateField, (client, field: string, value: any) => client.updateConfigField(field, value));

  handleClient(IPC_CHANNELS.apiKeys.list, (client) => client.getAPIKeys());
  handleClient(IPC_CHANNELS.apiKeys.add, (client, key: string) => client.addAPIKey(key));
  handleClient(IPC_CHANNELS.apiKeys.delete, (client, index: number) => client.deleteAPIKey(index));

  handleClient(IPC_CHANNELS.providerKeys.list, (client, provider: string) => client.getProviderKeys(provider));
  handleClient(IPC_CHANNELS.providerKeys.patch, (client, provider: string, body: any) => client.patchProviderKeys(provider, body));
  handleClient(IPC_CHANNELS.providerKeys.put, (client, provider: string, entries: any[]) => client.putProviderKeys(provider, entries));
  handleClient(IPC_CHANNELS.providerKeys.delete, (client, provider: string, index: number) => client.deleteProviderKey(provider, index));

  handleClient(IPC_CHANNELS.authFiles.list, (client) => client.getAuthFiles());
  handleClient(IPC_CHANNELS.authFiles.delete, (client, name: string) => client.deleteAuthFile(name));
  handleClient(IPC_CHANNELS.authFiles.toggle, (client, name: string, disabled: boolean) => client.toggleAuthFile(name, disabled));
  handleClient(IPC_CHANNELS.authFiles.patchFields, (client, name: string, fields: Record<string, any>) => client.patchAuthFileFields(name, fields));

  handleClient(IPC_CHANNELS.oauth.startLogin, async (client, provider: string) => {
    const result = await client.startOAuth(provider);
    shell.openExternal(result.url);
    return result;
  });
  handleClient(IPC_CHANNELS.oauth.getStatus, (client, state: string) => client.getAuthStatus(state));

  handleClient(IPC_CHANNELS.logs.get, (client, after: number, limit: number) => client.getLogs(after, limit));
  handle(IPC_CHANNELS.usage.get, () => usageRecorder.getRecords());
  handle(IPC_CHANNELS.usage.clear, () => usageRecorder.clear());
  handleClient(IPC_CHANNELS.models.get, (client, channel: string) => client.getModelDefinitions(channel));

  handle(IPC_CHANNELS.modelsDev.get, () => fetchModelsDevCatalog());
  handle(IPC_CHANNELS.modelsDev.registerPreset, (providerId: string) => registerModelsDevPresetSnapshot(providerId));

  handleClient(IPC_CHANNELS.authFiles.openFolder, async (client) => {
    const config = await client.getConfig();
    const authDir = config['auth-dir'] || '~/.cli-proxy-api';
    const resolved = authDir.replace(/^~/, os.homedir());
    shell.openPath(resolved);
  });

  handle(IPC_CHANNELS.appLogs.get, () => appLogger.getLogs());

  handle(IPC_CHANNELS.appUpdate.getVersion, () => app.getVersion());
  handle(IPC_CHANNELS.appUpdate.check, () => checkForAppUpdate());
  handle(IPC_CHANNELS.appUpdate.openReleasePage, (url: string) => shell.openExternal(url));

  handle(IPC_CHANNELS.prefs.get, (key: string) => store.get(key as any));
  handle(IPC_CHANNELS.prefs.set, (key: string, value: any) => store.set(key as any, value));

  handle(IPC_CHANNELS.zoom.get, () => store.get('zoom'));
  ipcMain.handle(IPC_CHANNELS.zoom.set, (event, factor: number) => {
    const clamped = Math.round(Math.max(0.6, Math.min(1.6, factor)) * 100) / 100;
    store.set('zoom', clamped);
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.webContents.setZoomFactor(clamped);
    return clamped;
  });
}
