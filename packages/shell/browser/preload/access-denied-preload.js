const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  closeAccessDeniedPopup: () => ipcRenderer.invoke('close-access-denied-popup'),
  onAccessDeniedInfo: (callback) => ipcRenderer.on('set-access-denied-info', callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
})
