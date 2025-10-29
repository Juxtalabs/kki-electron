const { globalShortcut } = require('electron')

let isInstalled = false
const registeredShortcuts = []
const BLOCKED_SHORTCUTS = [
  // Application switching
  'Alt+Tab',
  'Alt+Shift+Tab',
  'CommandOrControl+Tab',
  
  // Task manager and system
  'Alt+Escape',
  'CommandOrControl+Escape',
  'CommandOrControl+Shift+Escape', // Task Manager on Windows
  
  // Close window/application
  'Alt+F4',
  'CommandOrControl+Q',
  'CommandOrControl+W',
  
  // Minimize/Maximize
  'CommandOrControl+M',
  'F11', // Fullscreen toggle
  
  // Windows key combinations (Windows only)
  'Super+D', // Show desktop
  'Super+L', // Lock screen
  'Super+Tab', // Task view
  'Super+E', // File Explorer
  'Super+R', // Run dialog
  
  // Screenshot shortcuts
  'Super+Shift+S', // Snipping Tool (Windows)
  'CommandOrControl+Shift+3', // Screenshot (macOS)
  'CommandOrControl+Shift+4', // Screenshot selection (macOS)
  'CommandOrControl+Shift+5', // Screenshot options (macOS)
  
  // Developer tools (optional - comment out if you need them)
  'F12',
  'CommandOrControl+Shift+I',
  'CommandOrControl+Shift+J',
  'CommandOrControl+Shift+C',
  
  // Refresh
  'F5',
  'CommandOrControl+R',
  'CommandOrControl+Shift+R',
  
  // Browser navigation
  'Alt+Left',
  'Alt+Right',
  'CommandOrControl+Left',
  'CommandOrControl+Right',
  
  // New window/tab
  'CommandOrControl+N',
  'CommandOrControl+T',
  'CommandOrControl+Shift+N',
  'CommandOrControl+Shift+T',
]

function install() {
  if (isInstalled) {
    console.log('[KeyboardBlocker] Already installed')
    return true
  }

  try {
    let successCount = 0
    let failCount = 0

    BLOCKED_SHORTCUTS.forEach(shortcut => {
      try {
        const success = globalShortcut.register(shortcut, () => {
          // Empty callback - just intercept and do nothing
          // This prevents the shortcut from reaching the system
          console.log(`[KeyboardBlocker] Blocked: ${shortcut}`)
        })

        if (success) {
          registeredShortcuts.push(shortcut)
          successCount++
        } else {
          failCount++
          console.warn(`[KeyboardBlocker] Failed to register: ${shortcut}`)
        }
      } catch (error) {
        failCount++
        console.warn(`[KeyboardBlocker] Error registering ${shortcut}:`, error.message)
      }
    })

    isInstalled = true
    console.log(`[KeyboardBlocker] Installed successfully`)
    console.log(`[KeyboardBlocker] Registered: ${successCount} shortcuts`)
    if (failCount > 0) {
      console.warn(`[KeyboardBlocker] Failed: ${failCount} shortcuts`)
    }
    console.log(`[KeyboardBlocker] Blocked shortcuts: Alt+Tab, Alt+F4, F11, and ${successCount - 3} more`)

    return true
  } catch (error) {
    console.error('[KeyboardBlocker] Installation failed:', error)
    return false
  }
}

function uninstall() {
  if (!isInstalled) {
    console.log('[KeyboardBlocker] Not installed, nothing to uninstall')
    return true
  }

  try {
    // Unregister all shortcuts
    globalShortcut.unregisterAll()
    
    registeredShortcuts.length = 0
    isInstalled = false
    
    console.log('[KeyboardBlocker] Uninstalled successfully')
    return true
  } catch (error) {
    console.error('[KeyboardBlocker] Uninstallation failed:', error)
    return false
  }
}

function isActive() {
  return isInstalled
}

function getRegisteredShortcuts() {
  return [...registeredShortcuts]
}

function isAvailable() {
  return true
}

// Automatic cleanup on app quit
const { app } = require('electron')
app.on('will-quit', () => {
  if (isInstalled) {
    console.log('[KeyboardBlocker] App quitting, cleaning up')
    uninstall()
  }
})

module.exports = {
  install,
  uninstall,
  isInstalled: isActive,
  isAvailable,
  getRegisteredShortcuts
}
