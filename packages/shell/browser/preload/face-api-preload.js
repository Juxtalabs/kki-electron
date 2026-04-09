const { contextBridge, ipcRenderer } = require('electron')

// Expose Face API REST client ke renderer process
contextBridge.exposeInMainWorld('faceAPI', {
  // Initialize service
  initialize: () => ipcRenderer.invoke('face-api:initialize'),
  
  // Register new user
  registerUser: (userId, userName, imageBase64) => 
    ipcRenderer.invoke('face-api:register-user', userId, userName, imageBase64),
  
  // Verify user (1:1 authentication)
  verifyUser: (userId, imageBase64) => 
    ipcRenderer.invoke('face-api:verify-user', userId, imageBase64),
  
  // Identify user (1:N authentication)
  identifyUser: (imageBase64) => 
    ipcRenderer.invoke('face-api:identify-user', imageBase64),
  
  // Compare two images
  compareImages: (sourceImageBase64, targetImageBase64) => 
    ipcRenderer.invoke('face-api:compare-images', sourceImageBase64, targetImageBase64),
  
  // Delete user
  deleteUser: (userId) => 
    ipcRenderer.invoke('face-api:delete-user', userId),
  
  // Get registered users
  getRegisteredUsers: () => 
    ipcRenderer.invoke('face-api:get-registered-users'),
  
  // Check if user is registered
  isUserRegistered: (userId) => 
    ipcRenderer.invoke('face-api:is-user-registered', userId)
})

console.log('Face API REST preload script loaded')
