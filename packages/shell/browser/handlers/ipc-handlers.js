const { ipcMain } = require('electron')
const os = require('os')

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
}

module.exports = { setupIpcHandlers }
