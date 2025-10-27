const { BrowserWindow, session } = require('electron')
const { Tabs } = require('../tabs')

let webuiExtensionId = null

function setWebuiExtensionId(id) {
  webuiExtensionId = id
}

function getWebuiExtensionId() {
  return webuiExtensionId
}

class TabbedBrowserWindow {
  constructor(options) {
    this.session = options.session || session.defaultSession
    this.extensions = options.extensions

    // Can't inherit BrowserWindow
    // https://github.com/electron/electron/issues/23#issuecomment-19613241
    this.window = new BrowserWindow(options.window)
    this.id = this.window.id
    this.webContents = this.window.webContents

    const webuiUrl = `chrome-extension://${webuiExtensionId}/webui.html`
    this.webContents.loadURL(webuiUrl)

    this.tabs = new Tabs(this.window)

    const self = this

    this.tabs.on('tab-created', function onTabCreated(tab) {
      tab.loadURL(options.urls.newtab)

      // Track tab that may have been created outside of the extensions API.
      self.extensions.addTab(tab.webContents, tab.window)
    })

    this.tabs.on('tab-selected', function onTabSelected(tab) {
      self.extensions.selectTab(tab.webContents)
    })

    queueMicrotask(() => {
      // Create initial tab
      const tab = this.tabs.create()

      if (options.initialUrl) {
        tab.loadURL(options.initialUrl)
      }
    })
  }

  destroy() {
    this.tabs.destroy()
    this.window.destroy()
  }

  getFocusedTab() {
    return this.tabs.selected
  }
}

module.exports = { TabbedBrowserWindow, setWebuiExtensionId, getWebuiExtensionId }
