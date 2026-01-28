const path = require('path')
const os = require('os')

let nativeAddon = null
let isHookInstalled = false

/**
 * @brief Loads the native keyboard hook addon
 * 
 * Attempts to load the compiled native addon. Only works on Windows platforms.
 * On other platforms or if loading fails, returns null.
 * 
 * @returns {Object|null} The native addon object or null if unavailable
 */
function loadNativeAddon() {
  // Only load on Windows
  if (os.platform() !== 'win32') {
    console.log('[KeyboardHook] Not on Windows platform, keyboard hook disabled')
    throw new Error('Not on Windows platform')
  }

  // Try multiple possible paths for the native addon
  // Use app.getAppPath() to get the correct base path
  const { app } = require('electron')
  const appPath = app ? app.getAppPath() : process.cwd()
  
  const possiblePaths = [
    // Build output from binding.gyp (most common after electron-rebuild)
    path.join(appPath, 'build/Release/keyhook.node'),
    // Webpack output path (development)
    path.join(appPath, '.webpack/main/native/build/Release/keyhook.node'),
    path.join(appPath, '.webpack/main/build/Release/keyhook.node'),
    // Source path
    path.join(appPath, 'native/build/Release/keyhook.node'),
    // Relative to this file
    path.join(__dirname, '../../build/Release/keyhook.node'),
    path.join(__dirname, '../../native/build/Release/keyhook.node'),
    // Process cwd
    path.join(process.cwd(), 'build/Release/keyhook.node'),
    path.join(process.cwd(), 'native/build/Release/keyhook.node'),
    path.join(process.cwd(), '.webpack/main/native/build/Release/keyhook.node'),
    path.join(process.cwd(), '.webpack/main/build/Release/keyhook.node'),
    path.join(process.cwd(), 'browser/native/build/Release/keyhook.node'),
    // Packaged app paths
    path.join(process.resourcesPath || '', 'app.asar.unpacked/build/Release/keyhook.node'),
    path.join(process.resourcesPath || '', '../build/Release/keyhook.node'),
    // Absolute resolve
    path.resolve(__dirname, '../../build/Release/keyhook.node'),
    path.resolve(__dirname, '../../native/build/Release/keyhook.node'),
    path.resolve(process.resourcesPath || '', '../native/build/Release/keyhook.node'),
  ]

  let lastError = null
  const fs = require('fs')
  
  // Use native require to bypass webpack
  const nativeRequire = typeof __non_webpack_require__ !== 'undefined' 
    ? __non_webpack_require__ 
    : require
  
  for (const addonPath of possiblePaths) {
    try {
      // Check if file exists first
      if (!fs.existsSync(addonPath)) {
        continue
      }
      
      // Try to load with absolute path using native require
      const absolutePath = path.resolve(addonPath)
      nativeAddon = nativeRequire(absolutePath)
      return nativeAddon
    } catch (error) {
      lastError = error
      // Continue to next path
    }
  }

  // If all paths failed, throw the last error
  console.warn('[KeyboardHook] Failed to load native addon from all paths')
  console.warn('[KeyboardHook] Last error:', lastError.message)
  console.warn('[KeyboardHook] Falling back to JavaScript keyboard blocker')
  throw lastError
}

function install() {
  // Load addon if not already loaded
  if (!nativeAddon) {
    try {
      nativeAddon = loadNativeAddon()
    } catch (error) {
      // Addon failed to load, throw to trigger fallback
      throw error
    }
  }

  // If addon is not available, return false
  if (!nativeAddon) {
    return false
  }

  // If hook is already installed, return true
  if (isHookInstalled) {
    return true
  }

  try {
    const result = nativeAddon.install()
    if (result) {
      isHookInstalled = true
      console.log('[KeyboardHook] Keyboard hook installed successfully')
    }
    return result
  } catch (error) {
    return false
  }
}

function uninstall() {
  // If addon is not available, return true (nothing to uninstall)
  if (!nativeAddon) {
    return true
  }

  // If hook is not installed, return true
  if (!isHookInstalled) {
    return true
  }

  try {
    const result = nativeAddon.uninstall()
    if (result) {
      isHookInstalled = false
      console.log('[KeyboardHook] Keyboard hook uninstalled successfully')
    }
    return result
  } catch (error) {
    return false
  }
}

function isInstalled() {
  return isHookInstalled
}

function isAvailable() {
  if (!nativeAddon) {
    nativeAddon = loadNativeAddon()
  }
  return nativeAddon !== null
}

// Automatic cleanup on process exit
process.on('exit', () => {
  if (isHookInstalled) {
    uninstall()
  }
})

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  if (isHookInstalled) {
    uninstall()
  }
  process.exit(0)
})

// Handle SIGTERM
process.on('SIGTERM', () => {
  if (isHookInstalled) {
    uninstall()
  }
  process.exit(0)
})

module.exports = {
  install,
  uninstall,
  isInstalled,
  isAvailable
}
