const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('faceLogin', {
  initialize: () => ipcRenderer.invoke('face-api:initialize'),
  identify: (imageBase64) => ipcRenderer.invoke('face-api:identify-user', imageBase64),
  notifySuccess: () => ipcRenderer.send('face-login:success')
})
