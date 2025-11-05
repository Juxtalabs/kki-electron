const { ipcMain } = require('electron')
const os = require('os')
const { GenericAppLauncher } = require('../utils/generic-app-launcher')

function setupIpcHandlers() {
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

  // IPC handler for generic app launcher
  const genericAppLauncher = new GenericAppLauncher()
  
  // IPC handler for Discord launcher (legacy support)
  ipcMain.handle('sejati:launchDiscord', async () => {
    return await genericAppLauncher.handleAppClick('discord')
  })

  // IPC handler for generic app launcher
  ipcMain.handle('sejati:launchApp', async (event, appId) => {
    return await genericAppLauncher.handleAppClick(appId)
  })

  // IPC handler to get enabled app buttons configuration
  ipcMain.handle('sejati:getEnabledApps', async () => {
    return genericAppLauncher.getEnabledApps()
  })

  // IPC handler to reload app configuration
  ipcMain.handle('sejati:reloadAppConfig', async () => {
    genericAppLauncher.reloadConfig()
    return { success: true, message: 'App configuration reloaded' }
  })
}

module.exports = { setupIpcHandlers }
