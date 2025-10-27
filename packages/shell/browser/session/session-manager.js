const { app, session } = require('electron')
const { PATHS } = require('../config/paths')

function initSession(browserSession) {
  // Remove Electron and App details to closer emulate Chrome's UA
  const userAgent = browserSession
    .getUserAgent()
    .replace(/\sElectron\/\S+/, '')
    .replace(new RegExp(`\\s${app.getName()}/\\S+`), '')
  browserSession.setUserAgent(userAgent)

  browserSession.serviceWorkers.on('running-status-changed', (event) => {
    console.info(`service worker ${event.versionId} ${event.runningStatus}`)
  })

  if (process.env.SHELL_DEBUG) {
    browserSession.serviceWorkers.once('running-status-changed', () => {
      // Debug service worker will be handled by Browser class
    })
  }
}

function registerPreloadScripts(browserSession) {
  if ('registerPreloadScript' in browserSession) {
    browserSession.registerPreloadScript({
      id: 'shell-preload',
      type: 'frame',
      filePath: PATHS.PRELOAD,
    })
    // Register welcome page preload for file:// protocol
    browserSession.registerPreloadScript({
      id: 'welcome-preload',
      type: 'frame',
      filePath: PATHS.WELCOME_PRELOAD,
    })
  } else {
    // TODO(mv3): remove
    browserSession.setPreloads([PATHS.PRELOAD, PATHS.WELCOME_PRELOAD])
  }
}

module.exports = { initSession, registerPreloadScripts }
