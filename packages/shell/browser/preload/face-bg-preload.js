const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('faceBg', {
  initialize: () => ipcRenderer.invoke('face-api:initialize'),
  identify: (imageBase64) => ipcRenderer.invoke('face-api:identify-user', imageBase64),
  notifyResult: (success, userName) => ipcRenderer.send('face-bg:result', { success, userName })
})
