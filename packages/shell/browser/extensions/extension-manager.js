const { app, dialog } = require('electron')
const { ElectronChromeExtensions } = require('electron-chrome-extensions')
const { installChromeWebStore, loadAllExtensions } = require('electron-chrome-web-store')
const { PATHS } = require('../config/paths')

async function setupExtensions(browserInstance) {
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

  // Allow extensions to override new tab page
  extensions.on('url-overrides-updated', (urlOverrides) => {
    if (urlOverrides.newtab) {
      browserInstance.urls.newtab = urlOverrides.newtab
    }
  })

  return extensions
}

async function loadExtensions(browserSession) {
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
}

module.exports = { setupExtensions, loadExtensions }
