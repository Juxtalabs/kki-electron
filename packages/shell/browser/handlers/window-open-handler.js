function setupWindowOpenHandler(webContents, browserInstance) {
  webContents.setWindowOpenHandler((details) => {
    switch (details.disposition) {
      case 'foreground-tab':
      case 'background-tab':
      case 'new-window': {
        return {
          action: 'allow',
          outlivesOpener: true,
          createWindow: ({ webContents: guest, webPreferences }) => {
            const win = browserInstance.getWindowFromWebContents(webContents)
            const tab = win.tabs.create({ webContents: guest, webPreferences })
            tab.loadURL(details.url)
            return tab.webContents
          },
        }
      }
      default:
        return { action: 'allow' }
    }
  })
}

module.exports = { setupWindowOpenHandler }
