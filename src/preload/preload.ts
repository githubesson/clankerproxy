import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc';

function invoke(channel: string) {
  return (...args: any[]) => ipcRenderer.invoke(channel, ...args);
}

function subscribe<TPayload>(channel: string, callback: (payload: TPayload) => void) {
  const handler = (_event: IpcRendererEvent, payload: TPayload) => callback(payload);
  ipcRenderer.on(channel, handler);
  return () => {
    ipcRenderer.removeListener(channel, handler);
  };
}

const api = {
  proxy: {
    getStatus: invoke(IPC_CHANNELS.proxy.getStatus),
    start: invoke(IPC_CHANNELS.proxy.start),
    stop: invoke(IPC_CHANNELS.proxy.stop),
    restart: invoke(IPC_CHANNELS.proxy.restart),
    getLogs: invoke(IPC_CHANNELS.proxy.getLogs),
    onStateChange: (callback: (state: string) => void) => subscribe(IPC_CHANNELS.proxy.onStateChange, callback),
    onLog: (callback: (lines: string[]) => void) => subscribe(IPC_CHANNELS.proxy.onLog, callback),
  },
  binary: {
    getLatestRelease: invoke(IPC_CHANNELS.binary.getLatestRelease),
    checkForUpdate: invoke(IPC_CHANNELS.binary.checkForUpdate),
    download: (release?: any) => invoke(IPC_CHANNELS.binary.download)(release),
    isInstalled: invoke(IPC_CHANNELS.binary.isInstalled),
    currentVersion: invoke(IPC_CHANNELS.binary.currentVersion),
  },
  config: {
    get: invoke(IPC_CHANNELS.config.get),
    getYAML: invoke(IPC_CHANNELS.config.getYAML),
    putYAML: (yaml: string) => invoke(IPC_CHANNELS.config.putYAML)(yaml),
    updateField: (field: string, value: any) => invoke(IPC_CHANNELS.config.updateField)(field, value),
  },
  apiKeys: {
    list: invoke(IPC_CHANNELS.apiKeys.list),
    add: (key: string) => invoke(IPC_CHANNELS.apiKeys.add)(key),
    delete: (index: number) => invoke(IPC_CHANNELS.apiKeys.delete)(index),
  },
  providerKeys: {
    list: (provider: string) => invoke(IPC_CHANNELS.providerKeys.list)(provider),
    patch: (provider: string, body: any) => invoke(IPC_CHANNELS.providerKeys.patch)(provider, body),
    put: (provider: string, entries: any[]) => invoke(IPC_CHANNELS.providerKeys.put)(provider, entries),
    delete: (provider: string, index: number) => invoke(IPC_CHANNELS.providerKeys.delete)(provider, index),
  },
  authFiles: {
    list: invoke(IPC_CHANNELS.authFiles.list),
    delete: (name: string) => invoke(IPC_CHANNELS.authFiles.delete)(name),
    toggle: (name: string, disabled: boolean) => invoke(IPC_CHANNELS.authFiles.toggle)(name, disabled),
    patchFields: (name: string, fields: Record<string, any>) => invoke(IPC_CHANNELS.authFiles.patchFields)(name, fields),
    openFolder: invoke(IPC_CHANNELS.authFiles.openFolder),
  },
  oauth: {
    startLogin: (provider: string) => invoke(IPC_CHANNELS.oauth.startLogin)(provider),
    getStatus: (state: string) => invoke(IPC_CHANNELS.oauth.getStatus)(state),
  },
  logs: {
    get: (after: number, limit: number) => invoke(IPC_CHANNELS.logs.get)(after, limit),
  },
  usage: {
    get: invoke(IPC_CHANNELS.usage.get),
  },
  models: {
    get: (channel: string) => invoke(IPC_CHANNELS.models.get)(channel) as Promise<{ channel: string; models: any[] }>,
  },
  modelsDev: {
    get: () => invoke(IPC_CHANNELS.modelsDev.get)() as Promise<Record<string, any>>,
  },
  appLogs: {
    get: () => invoke(IPC_CHANNELS.appLogs.get)() as Promise<string[]>,
    onLog: (callback: (lines: string[]) => void) => subscribe(IPC_CHANNELS.appLogs.onLog, callback),
  },
  appUpdate: {
    getVersion: () => invoke(IPC_CHANNELS.appUpdate.getVersion)() as Promise<string>,
    check: () => invoke(IPC_CHANNELS.appUpdate.check)() as Promise<{ version: string; releaseUrl: string; publishedAt: string } | null>,
    openReleasePage: (url: string) => invoke(IPC_CHANNELS.appUpdate.openReleasePage)(url) as Promise<void>,
  },
  prefs: {
    get: (key: string) => invoke(IPC_CHANNELS.prefs.get)(key),
    set: (key: string, value: any) => invoke(IPC_CHANNELS.prefs.set)(key, value),
  },
  zoom: {
    get: () => invoke(IPC_CHANNELS.zoom.get)() as Promise<number>,
    set: (factor: number) => invoke(IPC_CHANNELS.zoom.set)(factor) as Promise<number>,
  },
};

contextBridge.exposeInMainWorld('clankerProxy', api);

export type ClankerProxyAPI = typeof api;
