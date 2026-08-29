const { ipcMain, app } = require('electron')
const os = require('os')
const { getExitPassword } = require('../security/exit-code')

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
      const correctPassword = await getExitPassword()
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

  // Refresh button: fetch a fresh copy from the server rather than replaying the
  // cache. Clears the stale service worker + HTTP/shader caches (login state in
  // localStorage/IndexedDB/cookies is kept), then reloads the focused tab
  // ignoring the cache - so a page that failed to load, or came up blank from a
  // corrupt cache, comes back from the network. Never throws.
  ipcMain.handle('kiosk:reloadFresh', async () => {
    try {
      const tab = browserInstance?.getFocusedWindow?.()?.getFocusedTab?.()
      const webContents = tab?.webContents
      if (!webContents || webContents.isDestroyed()) return

      if (typeof browserInstance.clearStaleWebCaches === 'function') {
        await browserInstance.clearStaleWebCaches()
      }

      if (webContents.isDestroyed()) return
      // Let the auto-recovery on the next failure fire again if it needs to.
      webContents.__cacheRecoveryAttempted = false
      webContents.reloadIgnoringCache()
    } catch (error) {
      console.error('Error during kiosk:reloadFresh:', error)
    }
  })

}

module.exports = { setupIpcHandlers }
