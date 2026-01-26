const { app, session, BrowserWindow, globalShortcut } = require('electron')
const { setupMenu } = require('../menu')
const { PATHS } = require('../config/paths')
const { getParentWindowOfTab } = require('../utils/helpers')
const { setupIpcHandlers } = require('../handlers/ipc-handlers')
const { initSession, registerPreloadScripts, getDomainInterceptor } = require('../session/session-manager')
const { setupExtensions, loadExtensions } = require('../extensions/extension-manager')
const { TabbedBrowserWindow, setWebuiExtensionId } = require('../windows/TabbedBrowserWindow')
const { setupContextMenu } = require('../handlers/context-menu-handler')
const { setupWindowOpenHandler } = require('../handlers/window-open-handler')
const { checkAndBlockIfMultipleMonitors } = require('../utils/monitor-detector')

// Try to load native keyboard hook, fallback to JavaScript blocker
let keyboardHook
try {
  keyboardHook = require('../utils/keyboard-hook')
} catch (error) {
  keyboardHook = require('../utils/keyboard-blocker')
}

class Browser {
  windows = []
  isQuitting = false

  urls = {
    newtab: 'https://ukom.konsilkesehatanindonesia.id',
  }

  constructor() {
    this.ready = new Promise((resolve) => {
      this.resolveReady = resolve
    })

    app.whenReady().then(() => {
      try {
        const accelerator = process.platform === 'darwin' ? 'Command+Shift+Q' : 'Ctrl+Shift+Q'
        globalShortcut.register(accelerator, () => this.destroy())
      } catch (error) {
        console.warn('Browser: Failed to register quit shortcut:', error.message)
      }

      this.init()
    })

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
    if (this.isQuitting) return
    this.isQuitting = true
    console.log('Browser: Cleaning up before exit...')
    
    // Stop native keyboard helper
    this.stopNativeKeyboardHelper()
    
    // Uninstall Electron keyboard hook
    try {
      if (keyboardHook.isInstalled && keyboardHook.isInstalled()) {
        console.log('Browser: Uninstalling Electron keyboard hook...')
        keyboardHook.uninstall()
      }
    } catch (error) {
      console.warn('Browser: Failed to uninstall Electron hook:', error.message)
    }
    
    console.log('Browser: Cleanup completed, quitting app...')

    // Force-destroy windows because we intentionally prevent user-driven closes.
    // app.quit() triggers BrowserWindow close events; if those are prevented the app won't quit.
    this.windows.forEach((win) => {
      try {
        if (win.window && !win.window.isDestroyed()) {
          win.window.destroy()
        }
      } catch (error) {
        console.warn('Browser: Failed to destroy window during quit:', error.message)
      }
    })

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
    // Check for multiple monitors and block if detected
    if (checkAndBlockIfMultipleMonitors()) {
      return // Exit if blocked
    }
    
    this.initSession()
    setupMenu(this)

    registerPreloadScripts(this.session)

    try {
      this.extensions = await setupExtensions(this)
    } catch (error) {
      console.warn('Browser: Failed to setup extensions:', error.message)
      this.extensions = null
    }

    try {
      const webuiExtensionId = await loadExtensions(this.session)
      if (webuiExtensionId) {
        setWebuiExtensionId(webuiExtensionId)
      } else {
        console.warn('Browser: Extensions not loaded, continuing without extensions')
      }
    } catch (error) {
      console.warn('Browser: Failed to load extensions:', error.message)
      // Continue without extensions - not critical for core functionality
    }

    // Install keyboard hook for kiosk mode security (unless disabled for development)
    if (process.env.DISABLE_WIN_KEY_BLOCK) {
      console.log('Browser: Windows key blocking DISABLED for development (DISABLE_WIN_KEY_BLOCK=true)')
    } else {
      console.log('Browser: Installing keyboard blocking system...')
      
      // Primary: Start native helper (handles Windows key effectively)
      this.startNativeKeyboardHelper()
      
      // Backup: Install Electron addon (handles key combinations)
      this.installElectronKeyboardHook()
    }

    this.createInitialWindow()
    this.resolveReady()
  }

  installElectronKeyboardHook() {
    try {
      if (keyboardHook.isAvailable()) {
        console.log('Browser: Installing Electron hook for key combinations...')
        const result = keyboardHook.install()
        if (result) {
          console.log('Browser: Electron hook installed successfully (backup for combinations)')
        } else {
          console.warn('Browser: Electron hook installation failed (expected limitation)')
        }
      } else {
        console.warn('Browser: Electron hook not available on this platform')
      }
    } catch (error) {
      console.warn('Browser: Electron hook error (expected):', error.message)
    }
  }

  startNativeKeyboardHelper() {
    const { spawn } = require('child_process')
    const path = require('path')
    
    try {
      // Path to native helper executable
      const helperPath = path.join(__dirname, '..', '..', 'keyhook-helper.exe')
      
      console.log('Browser: Starting native keyboard helper:', helperPath)
      
      // Spawn native helper process
      this.keyboardHelperProcess = spawn(helperPath, [], {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe']
      })
      
      this.keyboardHelperProcess.stdout.on('data', (data) => {
        console.log('KeyboardHelper:', data.toString().trim())
      })
      
      this.keyboardHelperProcess.stderr.on('data', (data) => {
        console.error('KeyboardHelper Error:', data.toString().trim())
      })
      
      this.keyboardHelperProcess.on('exit', (code) => {
        console.log('KeyboardHelper: Process exited with code', code)
        this.keyboardHelperProcess = null
      })
      
      this.keyboardHelperProcess.on('error', (error) => {
        console.error('KeyboardHelper: Failed to start:', error.message)
        this.keyboardHelperProcess = null
      })
      
      console.log('Browser: Native keyboard helper started successfully')
      
    } catch (error) {
      console.error('Browser: Failed to start native keyboard helper:', error.message)
    }
  }

  stopNativeKeyboardHelper() {
    if (this.keyboardHelperProcess) {
      console.log('Browser: Stopping native keyboard helper...')
      this.keyboardHelperProcess.kill()
      this.keyboardHelperProcess = null
    }
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
        frame: false,
        kiosk: true,
        icon: PATHS.APP_ICON,
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

    // Prevent closing window
    win.window.on('close', (event) => {
      if (this.isQuitting) return
      event.preventDefault()
    })

    if (process.env.SHELL_DEBUG) {
      win.webContents.openDevTools({ mode: 'detach' })
    }

    return win
  }

  createInitialWindow() {
    // Create browser window with external welcome page as initial URL
    const welcomeUrl = 'https://ukom.konsilkesehatanindonesia.id'
    this.createWindow({ initialUrl: welcomeUrl })

    // Test domain whitelist system in debug mode
    if (process.env.SHELL_DEBUG) {
      setTimeout(() => {
        this.testDomainWhitelist()
      }, 2000) // Wait 2 seconds after window creation
    }
  }

  testDomainWhitelist() {
    const domainInterceptor = getDomainInterceptor()
    if (domainInterceptor) {
      console.log('=== BROWSER: TESTING DOMAIN WHITELIST ===')
      domainInterceptor.testInterception()
      console.log('=== BROWSER: END DOMAIN WHITELIST TEST ===')
    }
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
