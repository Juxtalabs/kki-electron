const { contextBridge, ipcRenderer } = require('electron')

// Expose face verification API ke renderer process
contextBridge.exposeInMainWorld('faceVerification', {
  // Initialize service
  initialize: () => ipcRenderer.invoke('face-verification:initialize'),
  
  // Set reference descriptor
  setReference: (descriptorArray) => ipcRenderer.invoke('face-verification:set-reference', descriptorArray),
  
  // Verify descriptor
  verify: (descriptorArray) => ipcRenderer.invoke('face-verification:verify', descriptorArray),
  
  // Check if has reference
  hasReference: () => ipcRenderer.invoke('face-verification:has-reference'),
  
  // Start periodic verification
  startPeriodic: () => ipcRenderer.invoke('face-verification:start-periodic'),
  
  // Stop periodic verification
  stopPeriodic: () => ipcRenderer.invoke('face-verification:stop-periodic'),
  
  // Listen for capture trigger from main process
  onTriggerCapture: (callback) => {
    ipcRenderer.on('face-verification:trigger-capture', callback)
  },
  
  // Send capture result back to main process
  sendCaptureResult: (result) => {
    ipcRenderer.send('face-verification:capture-result', result)
  },
  
  // Remove listener
  removeListener: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  }
})

console.log('Face verification preload script loaded')
