const { BrowserWindow, webContents } = require('electron')

class FaceVerificationHelper {
  static openCameraOverlay() {
    console.log('FaceVerificationHelper: Opening camera overlay...')
    
    // Inject camera overlay UI
    const { injectFaceVerificationUI } = require('../ui/inject-face-verification')
    
    let injectedCount = 0
    
    // Get all webContents and inject to valid ones (not devtools, not internal)
    const allWebContents = webContents.getAllWebContents()
    console.log(`FaceVerificationHelper: Found ${allWebContents.length} total webContents`)
    
    for (const wc of allWebContents) {
      if (wc.isDestroyed()) continue
      
      const url = wc.getURL()
      const type = wc.getType()
      
      // Skip devtools, backgroundPage, and empty URLs
      if (type === 'remote' || type === 'backgroundPage') {
        console.log(`FaceVerificationHelper: Skipping ${type}: ${url}`)
        continue
      }
      
      // Skip internal electron URLs
      if (!url || url.startsWith('devtools://') || url.startsWith('chrome-extension://')) {
        console.log(`FaceVerificationHelper: Skipping internal: ${url}`)
        continue
      }
      
      // Inject to this webContents
      console.log(`FaceVerificationHelper: Injecting to [${type}]: ${url}`)
      injectFaceVerificationUI(wc)
      injectedCount++
    }
    
    console.log(`FaceVerificationHelper: Injected to ${injectedCount} webContents`)
  }
  
  static async testVerification(webContents) {
    if (!webContents || webContents.isDestroyed()) {
      console.warn('FaceVerificationHelper: Invalid webContents')
      return
    }
    
    try {
      const result = await webContents.executeJavaScript(`
        (async () => {
          if (window.faceVerification && window.faceVerificationUI) {
            await window.faceVerificationUI.openCamera();
            // Wait for camera to be ready
            await new Promise(resolve => setTimeout(resolve, 1000));
            await window.faceVerificationUI.captureAndVerify();
            return { success: true };
          }
          return { success: false, error: 'Face verification not available' };
        })()
      `)
      
      console.log('FaceVerificationHelper: Test result:', result)
      return result
    } catch (error) {
      console.error('FaceVerificationHelper: Test failed:', error)
      return { success: false, error: error.message }
    }
  }
}

module.exports = { FaceVerificationHelper }
