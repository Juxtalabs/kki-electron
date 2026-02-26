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
    this.browserInstance = options.browserInstance

    // Can't inherit BrowserWindow
    // https://github.com/electron/electron/issues/23#issuecomment-19613241
    this.window = new BrowserWindow(options.window)
    this.id = this.window.id
    this.webContents = this.window.webContents

    const webuiUrl = `chrome-extension://${webuiExtensionId}/webui.html`
    this.webContents.loadURL(webuiUrl)

    // Inject kioskAPI into WebUI after page loads
    this.webContents.on('did-finish-load', () => {
      this.injectKioskAPI()
    })

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

  injectKioskAPI() {
    // Create a global function that can be called from renderer
    // This is bound to the browser instance and doesn't require IPC
    const exitHandler = () => {
      if (this.browserInstance && typeof this.browserInstance.promptExitPassword === 'function') {
        this.browserInstance.promptExitPassword()
      }
    }
    
    // Store handler reference for cleanup
    this._kioskExitHandler = exitHandler
    
    // Inject kioskAPI into the WebUI window context
    // We expose a global function that the renderer can call
    this.webContents.executeJavaScript(`
      (function() {
        // Create a flag to trigger exit from renderer
        window.__KIOSK_EXIT_REQUESTED__ = false;
        
        // Expose kioskAPI
        if (!window.kioskAPI) {
          window.kioskAPI = {
            promptExit: function() {
              console.log('[kioskAPI] Exit button clicked, setting flag to true');
              window.__KIOSK_EXIT_REQUESTED__ = true;
            }
          };
          console.log('[kioskAPI] API injected successfully');
        }
      })();
    `).catch(err => {
      console.error('Failed to inject kioskAPI:', err)
    })
    
    // Listen for the flag via devtools protocol
    // Poll the window variable from main process
    this._kioskExitPoller = setInterval(() => {
      if (!this.webContents || this.webContents.isDestroyed()) {
        clearInterval(this._kioskExitPoller)
        return
      }
      
      this.webContents.executeJavaScript('window.__KIOSK_EXIT_REQUESTED__', true)
        .then(requested => {
          if (requested === true) {
            console.log('[TabbedBrowserWindow] Exit flag detected, triggering password prompt')
            // Reset flag FIRST before calling handler
            this.webContents.executeJavaScript('window.__KIOSK_EXIT_REQUESTED__ = false', true)
              .then(() => {
                // Trigger exit after flag is reset
                exitHandler()
              })
              .catch(err => {
                console.error('[TabbedBrowserWindow] Failed to reset flag:', err)
              })
          }
        })
        .catch(() => {
          // Ignore errors (webContents might be destroyed)
        })
    }, 150)
    
    // Cleanup when window is destroyed
    this.window.on('closed', () => {
      if (this._kioskExitPoller) {
        clearInterval(this._kioskExitPoller)
      }
    })
  }
}

module.exports = { TabbedBrowserWindow, setWebuiExtensionId, getWebuiExtensionId }
