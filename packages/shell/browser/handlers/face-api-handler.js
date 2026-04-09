const { ipcMain } = require('electron')

let faceAPIService = null

function setupFaceAPIHandlers(service) {
  faceAPIService = service

  // Initialize Face API service
  ipcMain.handle('face-api:initialize', async () => {
    try {
      await faceAPIService.initialize()
      return { success: true }
    } catch (error) {
      console.error('IPC: face-api:initialize error:', error)
      return { success: false, error: error.message }
    }
  })

  // Register new user
  ipcMain.handle('face-api:register-user', async (event, userId, userName, imageBase64) => {
    try {
      const result = await faceAPIService.registerUser(userId, userName, imageBase64)
      return result
    } catch (error) {
      console.error('IPC: face-api:register-user error:', error)
      return { success: false, error: error.message }
    }
  })

  // Verify user (1:1 authentication)
  ipcMain.handle('face-api:verify-user', async (event, userId, imageBase64) => {
    try {
      const result = await faceAPIService.verifyUser(userId, imageBase64)
      return result
    } catch (error) {
      console.error('IPC: face-api:verify-user error:', error)
      return { success: false, verified: false, error: error.message }
    }
  })

  // Identify user (1:N authentication)
  ipcMain.handle('face-api:identify-user', async (event, imageBase64) => {
    try {
      const result = await faceAPIService.identifyUser(imageBase64)
      return result
    } catch (error) {
      console.error('IPC: face-api:identify-user error:', error)
      return { success: false, identified: false, error: error.message }
    }
  })

  // Compare two images
  ipcMain.handle('face-api:compare-images', async (event, sourceImageBase64, targetImageBase64) => {
    try {
      const result = await faceAPIService.compareImages(sourceImageBase64, targetImageBase64)
      return result
    } catch (error) {
      console.error('IPC: face-api:compare-images error:', error)
      return { success: false, verified: false, error: error.message }
    }
  })

  // Delete user
  ipcMain.handle('face-api:delete-user', async (event, userId) => {
    try {
      const result = await faceAPIService.deleteUser(userId)
      return result
    } catch (error) {
      console.error('IPC: face-api:delete-user error:', error)
      return { success: false, error: error.message }
    }
  })

  // Get registered users
  ipcMain.handle('face-api:get-registered-users', async () => {
    try {
      const users = faceAPIService.getRegisteredUsers()
      return { success: true, users }
    } catch (error) {
      console.error('IPC: face-api:get-registered-users error:', error)
      return { success: false, users: [], error: error.message }
    }
  })

  // Check if user is registered
  ipcMain.handle('face-api:is-user-registered', async (event, userId) => {
    try {
      const isRegistered = faceAPIService.isUserRegistered(userId)
      return { success: true, isRegistered }
    } catch (error) {
      console.error('IPC: face-api:is-user-registered error:', error)
      return { success: false, isRegistered: false, error: error.message }
    }
  })

  console.log('Face API REST handlers registered')
}

module.exports = { setupFaceAPIHandlers }
