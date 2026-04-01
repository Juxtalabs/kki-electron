const { contextBridge, ipcRenderer } = require('electron')

// Expose face verification API ke renderer process
contextBridge.exposeInMainWorld('faceVerification', {
  // Initialize service
  initialize: () => ipcRenderer.invoke('face-verification:initialize'),
  
  // Set reference descriptors
  setReferenceDescriptors: (descriptorsArray) => 
    ipcRenderer.invoke('face-verification:set-references', descriptorsArray),
  
  // Get photos for extraction
  getPhotosForExtraction: () =>
    ipcRenderer.invoke('face-verification:get-photos'),
  
  // Verify descriptor
  verifyDescriptor: (descriptorArray) => 
    ipcRenderer.invoke('face-verification:verify', descriptorArray),
  
  // Check if has reference photos
  hasReferencePhotos: () => 
    ipcRenderer.invoke('face-verification:has-reference'),
  
  // Start periodic verification
  startPeriodicVerification: () => 
    ipcRenderer.invoke('face-verification:start-periodic'),
  
  // Stop periodic verification
  stopPeriodicVerification: () => 
    ipcRenderer.invoke('face-verification:stop-periodic'),
  
  // Listen for capture trigger from main process
  onTriggerCapture: (callback) => {
    ipcRenderer.on('face-verification:trigger-capture', callback)
  },
  
  // Send capture result back to main process
  sendCaptureResult: (result) => {
    ipcRenderer.send('face-verification:capture-result', result)
  }
})

console.log('Face verification preload script loaded')
