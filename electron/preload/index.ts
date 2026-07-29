import { contextBridge, ipcRenderer } from 'electron';

const api = {
  isDesktop: true as const,
  saveFile: (name: string, bytes: Uint8Array) =>
    ipcRenderer.invoke('dialog:saveFile', { name, bytes }),
  openJson: () => ipcRenderer.invoke('dialog:openJson'),
};

export type DesktopApi = typeof api;

contextBridge.exposeInMainWorld('desktop', api);
