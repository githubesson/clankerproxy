export const IPC_CHANNELS = {
  proxy: {
    getStatus: 'proxy:getStatus',
    start: 'proxy:start',
    stop: 'proxy:stop',
    restart: 'proxy:restart',
    getLogs: 'proxy:getLogs',
    onStateChange: 'proxy:stateChanged',
    onLog: 'proxy:log',
  },
  binary: {
    getLatestRelease: 'binary:getLatestRelease',
    checkForUpdate: 'binary:checkForUpdate',
    download: 'binary:download',
    isInstalled: 'binary:isInstalled',
    currentVersion: 'binary:currentVersion',
  },
  config: {
    get: 'config:get',
    getYAML: 'config:getYAML',
    putYAML: 'config:putYAML',
    updateField: 'config:updateField',
  },
  apiKeys: {
    list: 'apiKeys:list',
    add: 'apiKeys:add',
    delete: 'apiKeys:delete',
  },
  providerKeys: {
    list: 'providerKeys:list',
    patch: 'providerKeys:patch',
    put: 'providerKeys:put',
    delete: 'providerKeys:delete',
  },
  authFiles: {
    list: 'authFiles:list',
    delete: 'authFiles:delete',
    toggle: 'authFiles:toggle',
    patchFields: 'authFiles:patchFields',
    openFolder: 'authFiles:openFolder',
  },
  oauth: {
    startLogin: 'oauth:startLogin',
    getStatus: 'oauth:getStatus',
  },
  logs: {
    get: 'logs:get',
  },
  usage: {
    get: 'usage:get',
  },
  models: {
    get: 'models:get',
  },
  modelsDev: {
    get: 'modelsDev:get',
  },
  prefs: {
    get: 'prefs:get',
    set: 'prefs:set',
  },
  zoom: {
    get: 'zoom:get',
    set: 'zoom:set',
  },
  appLogs: {
    get: 'appLogs:get',
    onLog: 'app:log',
  },
  appUpdate: {
    getVersion: 'appUpdate:getVersion',
    check: 'appUpdate:check',
    openReleasePage: 'appUpdate:openReleasePage',
  },
} as const;
