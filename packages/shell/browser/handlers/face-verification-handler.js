const { ipcMain } = require('electron')

let faceVerificationService = null

function setupFaceVerificationHandlers(service) {
  faceVerificationService = service

  // Initialize face verification service
  ipcMain.handle('face-verification:initialize', async () => {
    try {
      await faceVerificationService.initialize()
      return { success: true }
    } catch (error) {
      console.error('IPC: face-verification:initialize error:', error)
      return { success: false, error: error.message }
    }
  })

  // Set reference descriptor
  ipcMain.handle('face-verification:set-reference', async (event, descriptorArray) => {
    try {
      const result = await faceVerificationService.setReferenceDescriptor(descriptorArray)
      return { success: true, ...result }
    } catch (error) {
      console.error('IPC: face-verification:set-reference error:', error)
      return { success: false, error: error.message }
    }
  })

  // Verify captured descriptor
  ipcMain.handle('face-verification:verify', async (event, descriptorArray) => {
    try {
      const result = faceVerificationService.verifyDescriptor(descriptorArray)
      return result
    } catch (error) {
      console.error('IPC: face-verification:verify error:', error)
      return { success: false, verified: false, error: error.message }
    }
  })

  // Check if reference photo exists
  ipcMain.handle('face-verification:has-reference', async () => {
    try {
      const hasReference = faceVerificationService.hasReferencePhoto()
      return { success: true, hasReference }
    } catch (error) {
      console.error('IPC: face-verification:has-reference error:', error)
      return { success: false, hasReference: false, error: error.message }
    }
  })

  // Start periodic verification
  ipcMain.handle('face-verification:start-periodic', async (event) => {
    try {
      // Callback untuk trigger capture dari renderer
      const captureCallback = async () => {
        // Send event ke renderer untuk capture photo
        event.sender.send('face-verification:trigger-capture')
        
        // Wait for response dari renderer
        return new Promise((resolve) => {
          ipcMain.once('face-verification:capture-result', async (_, captureData) => {
            if (captureData.success && captureData.descriptor) {
              const verifyResult = faceVerificationService.verifyDescriptor(captureData.descriptor)
              resolve(verifyResult)
            } else {
              resolve({
                success: false,
                verified: false,
                message: captureData.error || 'Failed to capture photo'
              })
            }
          })
        })
      }

      faceVerificationService.startPeriodicVerification(captureCallback)
      return { success: true, message: 'Periodic verification started' }
    } catch (error) {
      console.error('IPC: face-verification:start-periodic error:', error)
      return { success: false, error: error.message }
    }
  })

  // Stop periodic verification
  ipcMain.handle('face-verification:stop-periodic', async () => {
    try {
      faceVerificationService.stopPeriodicVerification()
      return { success: true, message: 'Periodic verification stopped' }
    } catch (error) {
      console.error('IPC: face-verification:stop-periodic error:', error)
      return { success: false, error: error.message }
    }
  })

  console.log('Face verification IPC handlers registered')
}

module.exports = { setupFaceVerificationHandlers }
