// Auto-generated type bridge for window.electronAPI (injected by agent-desktop/src/preload.ts)
// Only available when running inside Electron — always guard with: if (window.electronAPI)

interface ElectronOpenDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: { name: string; extensions: string[] }[];
  properties?: string[];
}

interface ElectronSaveDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: { name: string; extensions: string[] }[];
}

interface ElectronAPI {
  getVersion: () => Promise<string>;
  openFilePicker: (options: ElectronOpenDialogOptions) => Promise<{ canceled: boolean; filePaths: string[] }>;
  saveFilePicker: (options: ElectronSaveDialogOptions) => Promise<{ canceled: boolean; filePath?: string }>;
  writeFile: (filePath: string, data: string) => Promise<{ success: boolean; path: string }>;
  openExternal: (url: string) => Promise<void>;
  showNotification: (title: string, body: string) => Promise<void>;
  onUpdateAvailable: (cb: () => void) => void;
  onUpdateDownloaded: (cb: () => void) => void;
  installUpdate: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
