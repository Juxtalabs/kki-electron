const { contextBridge, ipcRenderer } = require('electron')

// Expose kiosk-specific methods to webui
contextBridge.exposeInMainWorld('kioskAPI', {
  promptExit: () => ipcRenderer.invoke('kiosk:prompt-exit')
})
