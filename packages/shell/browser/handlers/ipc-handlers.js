const { ipcMain, app } = require('electron')
const os = require('os')
const { SECURITY_CONFIG } = require('../config/security')

let browserInstance = null

function setupIpcHandlers(browser) {
  // Store browser instance for kiosk:prompt-exit handler
  if (browser) {
    browserInstance = browser
  }

  // IPC handler for welcome page user info
  ipcMain.handle('sejati:getUserInfo', async () => {
    const userInfo = os.userInfo()
    const username = userInfo?.username || process.env.USERNAME || 'User'
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = now.getFullYear()
    return {
      username,
      today: `${day}/${month}/${year}`
    }
  })

  // IPC handler for exit password verification
  ipcMain.handle('sejati:verifyExitPassword', async (event, password) => {
    try {
      const correctPassword = SECURITY_CONFIG.EXIT_PASSWORD
      return password === correctPassword
    } catch (error) {
      console.error('Error verifying exit password:', error)
      return false
    }
  })

  // IPC handler for exit application
  ipcMain.handle('sejati:exitApplication', async () => {
    app.quit()
  })

  // IPC handler for kiosk exit prompt
  // This triggers the password prompt overlay without killing the app
  ipcMain.handle('kiosk:prompt-exit', async () => {
    if (browserInstance && typeof browserInstance.promptExitPassword === 'function') {
      await browserInstance.promptExitPassword()
    } else {
      console.error('Browser instance not available for exit prompt')
    }
  })

}

module.exports = { setupIpcHandlers }
