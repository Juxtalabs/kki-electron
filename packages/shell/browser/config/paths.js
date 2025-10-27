const path = require('path')

// __dirname is: packages/shell/browser/config/
// SHELL_ROOT_DIR should be: packages/shell/
// ROOT_DIR should be: root of project
const SHELL_ROOT_DIR = path.join(__dirname, '../../')
const ROOT_DIR = path.join(__dirname, '../../../../')

function getPaths() {
  const { app } = require('electron')
  
  return {
    WEBUI: app.isPackaged
      ? path.resolve(process.resourcesPath, 'ui')
      : path.resolve(SHELL_ROOT_DIR, 'browser', 'ui'),
    PRELOAD: path.join(__dirname, '../../renderer/browser/preload.js'),
    LOCAL_EXTENSIONS: path.join(ROOT_DIR, 'extensions'),
    WELCOME_HTML: path.join(ROOT_DIR, 'dist/renderer/index.html'),
    WELCOME_PRELOAD: path.join(ROOT_DIR, 'dist/preload/preload.js'),
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
