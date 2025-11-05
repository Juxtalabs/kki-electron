import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('sejati', {
  getUserInfo: async (): Promise<{ username: string; today: string; }> => {
    return await ipcRenderer.invoke('sejati:getUserInfo');
  },
  launchDiscord: async (): Promise<{ success: boolean; action: string; message: string; }> => {
    return await ipcRenderer.invoke('sejati:launchDiscord');
  },
  launchApp: async (appId: string): Promise<{ success: boolean; action: string; message: string; }> => {
    return await ipcRenderer.invoke('sejati:launchApp', appId);
  },
  getEnabledApps: async (): Promise<Array<any>> => {
    return await ipcRenderer.invoke('sejati:getEnabledApps');
  },
  reloadAppConfig: async (): Promise<{ success: boolean; message: string; }> => {
    return await ipcRenderer.invoke('sejati:reloadAppConfig');
  }
});
