const { buildChromeContextMenu } = require('electron-chrome-context-menu')

function setupContextMenu(webContents, browserInstance) {
  webContents.on('context-menu', (event, params) => {
    const menu = buildChromeContextMenu({
      params,
      webContents,
      extensionMenuItems: browserInstance.extensions.getContextMenuItems(webContents, params),
      openLink: (url, disposition) => {
        const win = browserInstance.getFocusedWindow()

        switch (disposition) {
          case 'new-window':
            browserInstance.createWindow({ initialUrl: url })
            break
          default:
            const tab = win.tabs.create()
            tab.loadURL(url)
        }
      },
    })

    menu.popup()
  })
}

module.exports = { setupContextMenu }
