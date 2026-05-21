import { contextBridge, ipcRenderer } from 'electron';

// Expose ONLY specific named channels — never expose ipcRenderer directly
const electronAPI = {
  getVersion: (): Promise<string> =>
    ipcRenderer.invoke('app:get-version'),

  openFilePicker: (options: Electron.OpenDialogOptions): Promise<Electron.OpenDialogReturnValue> =>
    ipcRenderer.invoke('dialog:open-file', options),

  saveFilePicker: (options: Electron.SaveDialogOptions): Promise<Electron.SaveDialogReturnValue> =>
    ipcRenderer.invoke('dialog:save-file', options),

  writeFile: (filePath: string, data: string): Promise<{ success: boolean; path: string }> =>
    ipcRenderer.invoke('fs:write-file', filePath, data),

  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke('shell:open-external', url),

  showNotification: (title: string, body: string): Promise<void> =>
    ipcRenderer.invoke('notification:show', title, body),

  // Auto-update events
  onUpdateAvailable:  (cb: () => void) => { ipcRenderer.on('update:available', cb); },
  onUpdateDownloaded: (cb: () => void) => { ipcRenderer.on('update:downloaded', cb); },
  installUpdate: (): Promise<void> =>
    ipcRenderer.invoke('update:install'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for the renderer — copy this to frontend/src/types/electron.d.ts
// declare global {
//   interface Window {
//     electronAPI: typeof electronAPI;
//   }
// }
