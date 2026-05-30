import Store from 'electron-store';

interface StoreSchema {
  binaryVersion: string;
  port: number;
  autoStartProxy: boolean;
  autoStartApp: boolean;
  windowBounds: { x: number; y: number; width: number; height: number } | null;
  zoom: number;
  autoUpdateBinary: boolean;
  autoUpdateIntervalMinutes: number;
  autoUpdateModelsDevPresets: boolean;
  modelsDevPresetUpdateIntervalMinutes: number;
  modelsDevPresetModelSnapshots: Record<string, string[]>;
}

export const store = new Store<StoreSchema>({
  defaults: {
    binaryVersion: '',
    port: 8317,
    autoStartProxy: true,
    autoStartApp: false,
    windowBounds: null,
    zoom: 1.0,
    autoUpdateBinary: false,
    autoUpdateIntervalMinutes: 30,
    autoUpdateModelsDevPresets: true,
    modelsDevPresetUpdateIntervalMinutes: 30,
    modelsDevPresetModelSnapshots: {},
  },
});
