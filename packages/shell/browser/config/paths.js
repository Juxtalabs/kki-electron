const path = require('path')

// __dirname is: packages/shell/browser/config/
// SHELL_ROOT_DIR should be: packages/shell/
// ROOT_DIR should be: root of project
const SHELL_ROOT_DIR = path.join(__dirname, '../../')
const ROOT_DIR = path.join(__dirname, '../../../../')
const BROWSER_DIR = path.join(SHELL_ROOT_DIR, 'browser')

function getPaths() {
  const { app } = require('electron')
  const isPackaged = Boolean(app && app.isPackaged)
  
  return {
    WEBUI: isPackaged
      ? path.resolve(process.resourcesPath, 'ui')
      : path.resolve(SHELL_ROOT_DIR, 'browser', 'ui'),
    PRELOAD: path.join(__dirname, '../../renderer/browser/preload.js'),
    WEBUI_PRELOAD: path.join(SHELL_ROOT_DIR, 'browser', 'preload', 'webui-preload.js'),
    FACE_VERIFICATION_PRELOAD: path.join(BROWSER_DIR, 'preload', 'face-verification-preload.js'),
    FACE_API_PRELOAD: path.join(BROWSER_DIR, 'preload', 'face-api-preload.js'),
    FACE_LOGIN_HTML: isPackaged
      ? path.resolve(process.resourcesPath, 'ui', 'face-login.html')
      : path.resolve(SHELL_ROOT_DIR, 'browser', 'ui', 'face-login.html'),
    FACE_LOGIN_PRELOAD: path.join(BROWSER_DIR, 'preload', 'face-login-preload.js'),
    FACE_BG_HTML: isPackaged
      ? path.resolve(process.resourcesPath, 'ui', 'face-bg-identify.html')
      : path.resolve(SHELL_ROOT_DIR, 'browser', 'ui', 'face-bg-identify.html'),
    FACE_BG_PRELOAD: path.join(BROWSER_DIR, 'preload', 'face-bg-preload.js'),
    LOCAL_EXTENSIONS: path.join(ROOT_DIR, 'extensions'),
    WELCOME_HTML: path.join(ROOT_DIR, 'src/renderer/index.html'),
    WELCOME_PRELOAD: path.join(ROOT_DIR, 'dist/preload/preload.js'),
    APP_ICON: path.join(ROOT_DIR, 'assets', 'kki-icon.ico'),
  }
}

// Lazy load PATHS to avoid requiring electron at build time
let PATHS = null
Object.defineProperty(exports, 'PATHS', {
  get() {
    if (!PATHS) PATHS = getPaths()
    return PATHS
  }
})

module.exports.SHELL_ROOT_DIR = SHELL_ROOT_DIR
module.exports.ROOT_DIR = ROOT_DIR
