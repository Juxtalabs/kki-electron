const { app, dialog } = require('electron')
const { installChromeWebStore, loadAllExtensions } = require('electron-chrome-web-store')
const { PATHS } = require('../config/paths')

async function setupExtensions(browserInstance) {
  let ElectronChromeExtensions
  try {
    ;({ ElectronChromeExtensions } = require('electron-chrome-extensions'))
  } catch (error) {
    console.warn('Failed to load electron-chrome-extensions:', error.message)
    return null
  }

  const extensions = new ElectronChromeExtensions({
    license: 'internal-license-do-not-use',
    session: browserInstance.session,

    createTab: async (details) => {
      await browserInstance.ready

      const win =
        typeof details.windowId === 'number' &&
        browserInstance.windows.find((w) => w.id === details.windowId)

      if (!win) {
        throw new Error(`Unable to find windowId=${details.windowId}`)
      }

      const tab = win.tabs.create()

      if (details.url) tab.loadURL(details.url)
      if (typeof details.active === 'boolean' ? details.active : true) win.tabs.select(tab.id)

      return [tab.webContents, tab.window]
    },
    selectTab: (tab, browserWindow) => {
      const win = browserInstance.getWindowFromBrowserWindow(browserWindow)
      win?.tabs.select(tab.id)
    },
    removeTab: (tab, browserWindow) => {
      const win = browserInstance.getWindowFromBrowserWindow(browserWindow)
      win?.tabs.remove(tab.id)
    },

    createWindow: async (details) => {
      await browserInstance.ready

      const win = browserInstance.createWindow({
        initialUrl: details.url,
      })
      return win.window
    },
    removeWindow: (browserWindow) => {
      const win = browserInstance.getWindowFromBrowserWindow(browserWindow)
      win?.destroy()
    },
  })

  // Display <browser-action-list> extension icons.
  ElectronChromeExtensions.handleCRXProtocol(browserInstance.session)

  extensions.on('browser-action-popup-created', (popup) => {
    browserInstance.popup = popup
  })

  // NOTE: We intentionally ignore extension new-tab overrides so that
  // Browser.urls.newtab (configured in Browser.js) is always used for
  // new tabs. This keeps the new tab page fixed to the UKOM URL.

  return extensions
}

async function loadExtensions(browserSession) {
  try {
    // Check if extensions API is available
    if (!browserSession.extensions || typeof browserSession.extensions.loadExtension !== 'function') {
      console.warn('Extensions API not available in this Electron version')
      return null
    }

    const webuiExtension = await browserSession.extensions.loadExtension(PATHS.WEBUI)

    // Wait for web store extensions to finish loading
    await installChromeWebStore({
      session: browserSession,
      async beforeInstall(details) {
        if (!details.browserWindow || details.browserWindow.isDestroyed()) return

        const title = `Add "${details.localizedName}"?`

        let message = `${title}`
        if (details.manifest.permissions) {
          const permissions = (details.manifest.permissions || []).join(', ')
          message += `\n\nPermissions: ${permissions}`
        }

      const returnValue = await dialog.showMessageBox(details.browserWindow, {
        title,
        message,
        icon: details.icon,
        buttons: ['Cancel', 'Add Extension'],
      })

      return { action: returnValue.response === 0 ? 'deny' : 'allow' }
    },
  })

  if (!app.isPackaged) {
    await loadAllExtensions(browserSession, PATHS.LOCAL_EXTENSIONS, {
      allowUnpacked: true,
    })
  }

  // Start service workers for MV3 extensions
  await Promise.all(
    browserSession.extensions.getAllExtensions().map(async (extension) => {
      const manifest = extension.manifest
      if (manifest.manifest_version === 3 && manifest?.background?.service_worker) {
        await browserSession.serviceWorkers.startWorkerForScope(extension.url).catch((error) => {
          console.error(error)
        })
      }
    }),
  )

  return webuiExtension.id
  } catch (error) {
    console.error('Failed to load extensions:', error.message)
    return null
  }
}

module.exports = { setupExtensions, loadExtensions }
