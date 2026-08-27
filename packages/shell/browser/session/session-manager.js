const { app, session } = require('electron')
const { PATHS } = require('../config/paths')
const fs = require('fs')
const DomainInterceptor = require('../security/domain-interceptor')
const diag = require('../utils/diag-log')

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

  // A TLS filter on the exam network answers for the portal with its own block
  // page certificate; Chromium reports that as a bare ERR_CERT_INVALID error
  // page with nothing in it naming the interceptor. Record which host and which
  // issuer, then let Electron reject as usual - certificates are not something a
  // kiosk should ever wave through.
  browserSession.setCertificateVerifyProc((request, callback) => {
    if (request.verificationResult !== 'net::OK') {
      diag.write('Certificate', `WARN ${request.verificationResult} for ${request.hostname}`, {
        issuer: request.certificate?.issuerName,
        subject: request.certificate?.subjectName,
        errorCode: request.errorCode,
      })
    }
    // -3 means "use Chromium's own verdict"
    callback(-3)
  })

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
