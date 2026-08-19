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
  'CommandOrControl+Escape', // Ctrl+Esc (Start Menu on Windows)
  'CommandOrControl+Shift+Escape', // Task Manager on Windows
  // Note: Ctrl+Alt+Del cannot be blocked - it's a Secure Attention Sequence handled by Windows kernel
  
  // Close window/application
  'Alt+F4',
  'CommandOrControl+Q',
  'CommandOrControl+W',
  
  // Minimize/Maximize
  'CommandOrControl+M',
  'F11', // Fullscreen toggle
  
  // Windows key combinations (Windows only)
  'Super+D', // Show desktop
  'Super+L', // Lock screen (Win+L)
  'Super+G', // Game Bar (Win+G)
  'Super+Tab', // Task view
  'Super+E', // File Explorer
  'Super+R', // Run dialog
  
  // Screenshot shortcuts (Windows)
  // PrintScreen has to be listed with every modifier combination: registering
  // the bare accelerator does not cover Alt+PrtScn or Win+PrtScn, and each of
  // those is a working capture on its own.
  'PrintScreen', // Full screen to clipboard / Snipping Tool on Win11
  'Alt+PrintScreen', // Active window to clipboard
  'Shift+PrintScreen',
  'CommandOrControl+PrintScreen',
  'Super+PrintScreen', // Saves straight to Pictures\Screenshots
  'Super+Alt+PrintScreen', // Game Bar screenshot
  'Super+Shift+PrintScreen',
  'Super+Shift+S', // Snipping Tool
  'Super+S', // Search, also opens capture surfaces
  'Super+Shift+R', // Snipping Tool screen recording (Win11 23H2+)
  'Super+Alt+R', // Game Bar: start/stop recording
  'Super+Alt+G', // Game Bar: record the last 30 seconds

  // Screenshot shortcuts (macOS)
  'CommandOrControl+Shift+3', // Whole screen to file
  'CommandOrControl+Shift+4', // Selection to file
  'CommandOrControl+Shift+5', // Screenshot / screen recording panel
  'CommandOrControl+Shift+6', // Touch Bar capture
  'CommandOrControl+Control+Shift+3', // Whole screen to clipboard
  'CommandOrControl+Control+Shift+4', // Selection to clipboard
  'CommandOrControl+Control+Shift+5',
  
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
