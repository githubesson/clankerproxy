import { contextBridge, ipcRenderer } from 'electron';

const api = {
  proxy: {
    getStatus: () => ipcRenderer.invoke('proxy:getStatus'),
    start: () => ipcRenderer.invoke('proxy:start'),
    stop: () => ipcRenderer.invoke('proxy:stop'),
    restart: () => ipcRenderer.invoke('proxy:restart'),
    getLogs: () => ipcRenderer.invoke('proxy:getLogs'),
    onStateChange: (callback: (state: string) => void) => {
      const handler = (_: any, state: string) => callback(state);
      ipcRenderer.on('proxy:stateChanged', handler);
      return () => ipcRenderer.removeListener('proxy:stateChanged', handler);
    },
    onLog: (callback: (lines: string[]) => void) => {
      const handler = (_: any, lines: string[]) => callback(lines);
      ipcRenderer.on('proxy:log', handler);
      return () => ipcRenderer.removeListener('proxy:log', handler);
    },
  },
  binary: {
    getLatestRelease: () => ipcRenderer.invoke('binary:getLatestRelease'),
    checkForUpdate: () => ipcRenderer.invoke('binary:checkForUpdate'),
    download: (release?: any) => ipcRenderer.invoke('binary:download', release),
    isInstalled: () => ipcRenderer.invoke('binary:isInstalled'),
    currentVersion: () => ipcRenderer.invoke('binary:currentVersion'),
  },
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    getYAML: () => ipcRenderer.invoke('config:getYAML'),
    putYAML: (yaml: string) => ipcRenderer.invoke('config:putYAML', yaml),
    updateField: (field: string, value: any) => ipcRenderer.invoke('config:updateField', field, value),
  },
  apiKeys: {
    list: () => ipcRenderer.invoke('apiKeys:list'),
    add: (key: string) => ipcRenderer.invoke('apiKeys:add', key),
    delete: (index: number) => ipcRenderer.invoke('apiKeys:delete', index),
  },
  providerKeys: {
    list: (provider: string) => ipcRenderer.invoke('providerKeys:list', provider),
    patch: (provider: string, body: any) => ipcRenderer.invoke('providerKeys:patch', provider, body),
    delete: (provider: string, index: number) => ipcRenderer.invoke('providerKeys:delete', provider, index),
  },
  authFiles: {
    list: () => ipcRenderer.invoke('authFiles:list'),
    delete: (name: string) => ipcRenderer.invoke('authFiles:delete', name),
    toggle: (name: string, disabled: boolean) => ipcRenderer.invoke('authFiles:toggle', name, disabled),
    patchFields: (name: string, fields: Record<string, any>) => ipcRenderer.invoke('authFiles:patchFields', name, fields),
  },
  oauth: {
    startLogin: (provider: string) => ipcRenderer.invoke('oauth:startLogin', provider),
    getStatus: (state: string) => ipcRenderer.invoke('oauth:getStatus', state),
  },
  logs: {
    get: (after: number, limit: number) => ipcRenderer.invoke('logs:get', after, limit),
  },
  usage: {
    get: () => ipcRenderer.invoke('usage:get'),
  },
  models: {
    get: (channel: string) => ipcRenderer.invoke('models:get', channel) as Promise<{ channel: string; models: any[] }>,
  },
  prefs: {
    get: (key: string) => ipcRenderer.invoke('prefs:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('prefs:set', key, value),
  },
  zoom: {
    get: () => ipcRenderer.invoke('zoom:get') as Promise<number>,
    set: (factor: number) => ipcRenderer.invoke('zoom:set', factor) as Promise<number>,
  },
};

contextBridge.exposeInMainWorld('clankerProxy', api);

export type ClankerProxyAPI = typeof api;
