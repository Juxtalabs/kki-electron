const { app, session, BrowserWindow } = require('electron')
const { setupMenu } = require('../menu')
const { PATHS } = require('../config/paths')
const { getParentWindowOfTab } = require('../utils/helpers')
const { setupIpcHandlers } = require('../handlers/ipc-handlers')
const { initSession, registerPreloadScripts } = require('../session/session-manager')
const { setupExtensions, loadExtensions } = require('../extensions/extension-manager')
const { TabbedBrowserWindow, setWebuiExtensionId } = require('../windows/TabbedBrowserWindow')
const { setupContextMenu } = require('../handlers/context-menu-handler')
const { setupWindowOpenHandler } = require('../handlers/window-open-handler')

class Browser {
  windows = []

  urls = {
    newtab: 'about:blank',
  }

  constructor() {
    this.ready = new Promise((resolve) => {
      this.resolveReady = resolve
    })

    app.whenReady().then(this.init.bind(this))

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.destroy()
      }
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) this.createInitialWindow()
    })

    app.on('web-contents-created', this.onWebContentsCreated.bind(this))

    // Setup IPC handlers
    setupIpcHandlers()
  }

  destroy() {
    app.quit()
  }

  getFocusedWindow() {
    return this.windows.find((w) => w.window.isFocused()) || this.windows[0]
  }

  getWindowFromBrowserWindow(window) {
    return !window.isDestroyed() ? this.windows.find((win) => win.id === window.id) : null
  }

  getWindowFromWebContents(webContents) {
    let window

    if (this.popup && webContents === this.popup.browserWindow?.webContents) {
      window = this.popup.parent
    } else {
      window = getParentWindowOfTab(webContents)
    }

    return window ? this.getWindowFromBrowserWindow(window) : null
  }

  async init() {
    this.initSession()
    setupMenu(this)

    registerPreloadScripts(this.session)

    this.extensions = await setupExtensions(this)

    const webuiExtensionId = await loadExtensions(this.session)
    setWebuiExtensionId(webuiExtensionId)

    this.createInitialWindow()
    this.resolveReady()
  }

  initSession() {
    this.session = session.defaultSession
    initSession(this.session)

    if (process.env.SHELL_DEBUG) {
      this.session.serviceWorkers.once('running-status-changed', () => {
        const tab = this.windows[0]?.getFocusedTab()
        if (tab) {
          tab.webContents.inspectServiceWorker()
        }
      })
    }
  }

  createWindow(options) {
    const win = new TabbedBrowserWindow({
      ...options,
      urls: this.urls,
      extensions: this.extensions,
      window: {
        width: 1280,
        height: 720,
        frame: false,
        titleBarStyle: 'hidden',
        titleBarOverlay: {
          height: 31,
          color: '#39375b',
          symbolColor: '#ffffff',
        },
        webPreferences: {
          sandbox: true,
          nodeIntegration: false,
          enableRemoteModule: false,
          contextIsolation: true,
          worldSafeExecuteJavaScript: true,
        },
      },
    })
    this.windows.push(win)

    if (process.env.SHELL_DEBUG) {
      win.webContents.openDevTools({ mode: 'detach' })
    }

    return win
  }

  createInitialWindow() {
    // Create browser window with welcome page as initial URL
    const welcomeUrl = `file://${PATHS.WELCOME_HTML}`
    this.createWindow({ initialUrl: welcomeUrl })
  }

  async onWebContentsCreated(event, webContents) {
    const type = webContents.getType()
    const url = webContents.getURL()
    console.log(`'web-contents-created' event [type:${type}, url:${url}]`)

    if (process.env.SHELL_DEBUG && ['backgroundPage', 'remote'].includes(webContents.getType())) {
      webContents.openDevTools({ mode: 'detach', activate: true })
    }

    setupWindowOpenHandler(webContents, this)
    setupContextMenu(webContents, this)
  }
}

module.exports = Browser
