const { app, session } = require('electron')
const { PATHS } = require('../config/paths')
const fs = require('fs')
const DomainInterceptor = require('../security/domain-interceptor')

let domainInterceptor = null

function initSession(browserSession) {
  // Initialize domain interceptor if not already done
  if (!domainInterceptor) {
    domainInterceptor = new DomainInterceptor()
  }

  // Remove Electron and App details to closer emulate Chrome's UA
  const userAgent = browserSession
    .getUserAgent()
    .replace(/\sElectron\/\S+/, '')
    .replace(new RegExp(`\\s${app.getName()}/\\S+`), '')
  browserSession.setUserAgent(userAgent)

  // Setup domain whitelist interceptor
  domainInterceptor.setupInterceptor(browserSession)

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
  const preloadFiles = []

  if (fs.existsSync(PATHS.PRELOAD)) {
    preloadFiles.push({
      id: 'shell-preload',
      type: 'frame',
      filePath: PATHS.PRELOAD,
    })
  }

  if (fs.existsSync(PATHS.WEBUI_PRELOAD)) {
    preloadFiles.push({
      id: 'webui-preload',
      type: 'frame',
      filePath: PATHS.WEBUI_PRELOAD,
    })
  }

  if (fs.existsSync(PATHS.WELCOME_PRELOAD)) {
    preloadFiles.push({
      id: 'welcome-preload',
      type: 'frame',
      filePath: PATHS.WELCOME_PRELOAD,
    })
  }

  if (!preloadFiles.length) {
    return
  }

  if ('registerPreloadScript' in browserSession) {
    for (const preload of preloadFiles) {
      browserSession.registerPreloadScript(preload)
    }
  } else {
    // TODO(mv3): remove
    const preloadPaths = preloadFiles.map((p) => p.filePath)
    browserSession.setPreloads(preloadPaths)
  }
}

module.exports = { 
  initSession, 
  registerPreloadScripts,
  getDomainInterceptor: () => domainInterceptor
}
