import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('sejati', {
  getUserInfo: async (): Promise<{ username: string; today: string; }> => {
    return await ipcRenderer.invoke('sejati:getUserInfo');
  }
});
