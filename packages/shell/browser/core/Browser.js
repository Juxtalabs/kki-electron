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
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

// Separate native hook and JS blocker so we can reliably fallback
let nativeKeyboardHook = null
let keyboardBlocker = null

try {
  nativeKeyboardHook = require('../utils/keyboard-hook')
} catch (error) {
  console.warn('Browser: Native keyboard hook module not available, will use JavaScript blocker only')
}

keyboardBlocker = require('../utils/keyboard-blocker')

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
    
    // Uninstall keyboard hooks
    try {
      if (nativeKeyboardHook && nativeKeyboardHook.isInstalled && nativeKeyboardHook.isInstalled()) {
        console.log('Browser: Uninstalling native keyboard hook...')
        nativeKeyboardHook.uninstall()
      }
    } catch (error) {
      console.warn('Browser: Failed to uninstall native keyboard hook:', error.message)
    }

    try {
      if (keyboardBlocker && keyboardBlocker.isInstalled && keyboardBlocker.isInstalled()) {
        console.log('Browser: Uninstalling keyboard blocker...')
        keyboardBlocker.uninstall()
      }
    } catch (error) {
      console.warn('Browser: Failed to uninstall keyboard blocker:', error.message)
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
    // This method manages both native hook (Windows) and JS-only blocker as fallback.
    // It is designed to NEVER throw, so that Browser.init() always continues.

    // Try native hook first on Windows, but ignore all errors.
    if (process.platform === 'win32' && nativeKeyboardHook && typeof nativeKeyboardHook.install === 'function') {
      try {
        console.log('Browser: Installing native keyboard hook (backup for combinations)...')
        const nativeInstalled = nativeKeyboardHook.install()
        if (nativeInstalled) {
          console.log('Browser: Native keyboard hook installed successfully')
        } else {
          console.warn('Browser: Native keyboard hook installation returned false')
        }
      } catch (error) {
        console.warn('Browser: Native keyboard hook error (expected, will fallback to JS blocker):', error.message)
      }
    }

    // Always ensure JS blocker is installed as safety net
    if (keyboardBlocker && keyboardBlocker.isAvailable && keyboardBlocker.isAvailable()) {
      try {
        console.log('Browser: Installing JavaScript keyboard blocker...')
        const blockerResult = keyboardBlocker.install()
        if (blockerResult) {
          console.log('Browser: Keyboard blocker installed successfully (shortcuts like Alt+Tab will be blocked)')
        } else {
          console.warn('Browser: Keyboard blocker installation returned false')
        }
      } catch (error) {
        console.warn('Browser: Keyboard blocker installation error:', error.message)
      }
    } else {
      console.warn('Browser: Keyboard blocker not available - keyboard security may be reduced')
    }
  }

  startNativeKeyboardHelper() {
    if (process.platform !== 'win32') return

    try {
      const candidates = []

      // Packaged app: helper is placed next to app resources
      if (app.isPackaged && process.resourcesPath) {
        candidates.push(path.join(process.resourcesPath, 'keyhook-helper.exe'))
      }

      // Dev / direct run: helper lives in shell package native folder
      candidates.push(path.join(__dirname, '..', '..', 'native', 'keyhook-helper.exe'))
      candidates.push(path.join(__dirname, '..', '..', 'keyhook-helper.exe'))

      const helperPath = candidates.find((p) => fs.existsSync(p))

      if (!helperPath) {
        console.warn('KeyboardHelper: keyhook-helper.exe not found in any known path')
        return
      }

      console.log('Browser: Starting native keyboard helper:', helperPath)

      this.nativeHelperProcess = spawn(helperPath, [], {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      })

      // Keep process alive - don't unref
      // this.nativeHelperProcess.unref()
      
      // Log any output from helper
      if (this.nativeHelperProcess.stdout) {
        this.nativeHelperProcess.stdout.on('data', (data) => {
          console.log('[KeyboardHelper]', data.toString().trim())
        })
      }
      
      if (this.nativeHelperProcess.stderr) {
        this.nativeHelperProcess.stderr.on('data', (data) => {
          console.warn('[KeyboardHelper Error]', data.toString().trim())
        })
      }
      
      this.nativeHelperProcess.on('exit', (code) => {
        console.warn('[KeyboardHelper] Process exited with code:', code)
        this.nativeHelperProcess = null
      })
      
      console.log('Browser: Native keyboard helper started successfully (PID:', this.nativeHelperProcess.pid, ')')
    } catch (error) {
      console.warn('KeyboardHelper: Failed to start:', error.message)
    }
  }

  stopNativeKeyboardHelper() {
    if (this.nativeHelperProcess) {
      console.log('Browser: Stopping native keyboard helper...')
      try {
        this.nativeHelperProcess.kill()
      } catch (_) {
        // ignore
      }
      this.nativeHelperProcess = null
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
