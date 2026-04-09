const { BrowserWindow, webContents } = require('electron')
const fs = require('fs')
const path = require('path')

class FaceAPIPanelHelper {
  static openPanel() {
    console.log('FaceAPIPanelHelper: Opening Face API panel...')
    
    // Inject Face API panel UI
    const { injectFaceAPIPanel } = require('../ui/inject-face-api-panel')
    
    let injectedCount = 0
    
    // Get all webContents and inject to valid ones
    const allWebContents = webContents.getAllWebContents()
    console.log(`FaceAPIPanelHelper: Found ${allWebContents.length} total webContents`)
    
    for (const wc of allWebContents) {
      if (wc.isDestroyed()) continue
      
      const url = wc.getURL()
      const type = wc.getType()
      
      // Skip devtools, backgroundPage, and empty URLs
      if (type === 'remote' || type === 'backgroundPage') {
        console.log(`FaceAPIPanelHelper: Skipping ${type}: ${url}`)
        continue
      }
      
      // Skip internal electron URLs
      if (!url || url.startsWith('devtools://') || url.startsWith('chrome-extension://')) {
        console.log(`FaceAPIPanelHelper: Skipping internal: ${url}`)
        continue
      }
      
      // Inject to this webContents
      console.log(`FaceAPIPanelHelper: Injecting to [${type}]: ${url}`)
      injectFaceAPIPanel(wc)
      injectedCount++
    }
    
    console.log(`FaceAPIPanelHelper: Injected to ${injectedCount} webContents`)
  }
}

module.exports = { FaceAPIPanelHelper }
