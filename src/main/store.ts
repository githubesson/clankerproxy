import Store from 'electron-store';

interface StoreSchema {
  binaryVersion: string;
  port: number;
  autoStartProxy: boolean;
  autoStartApp: boolean;
  windowBounds: { x: number; y: number; width: number; height: number } | null;
  managementSecret: string;
  zoom: number;
}

export const store = new Store<StoreSchema>({
  defaults: {
    binaryVersion: '',
    port: 8317,
    autoStartProxy: true,
    autoStartApp: false,
    windowBounds: null,
    managementSecret: '',
    zoom: 1.0,
  },
});
