// Utility to disable system shortcuts via Windows Registry
// This requires admin privileges

const { execSync } = require('child_process')
const os = require('os')

/**
 * Disable Task Manager (from Ctrl+Alt+Del) via Registry
 * Requires admin privileges
 */
function disableTaskManager() {
  if (process.platform !== 'win32') {
    console.log('[SystemShortcuts] Not on Windows, skipping Task Manager disable')
    return false
  }

  try {
    console.log('[SystemShortcuts] Disabling Task Manager (Ctrl+Alt+Del)...')
    
    execSync('reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System /v DisableTaskMgr /t REG_DWORD /d 1 /f', { 
      stdio: 'ignore',
      shell: true 
    })
    
    console.log('[SystemShortcuts] Task Manager disabled successfully')
    return true
  } catch (error) {
    console.warn('[SystemShortcuts] Failed to disable Task Manager:', error.message)
    return false
  }
}

/**
 * Disable Lock Workstation (Win+L) via Registry
 */
function disableLockWorkstation() {
  if (process.platform !== 'win32') return false

  try {
    console.log('[SystemShortcuts] Disabling Lock Workstation (Win+L)...')
    
    execSync('reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System /v DisableLockWorkstation /t REG_DWORD /d 1 /f', { 
      stdio: 'ignore',
      shell: true 
    })
    
    console.log('[SystemShortcuts] Lock Workstation disabled successfully')
    return true
  } catch (error) {
    console.warn('[SystemShortcuts] Failed to disable Lock Workstation:', error.message)
    return false
  }
}

/**
 * Disable Windows Game Bar (Win+G) via Registry
 */
function disableGameBar() {
  if (process.platform !== 'win32') return false

  try {
    console.log('[SystemShortcuts] Disabling Game Bar (Win+G)...')
    
    execSync('reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR /v AppCaptureEnabled /t REG_DWORD /d 0 /f', { 
      stdio: 'ignore',
      shell: true 
    })
    
    // Also disable Game Bar tips
    execSync('reg add HKCU\\System\\GameConfigStore /v GameDVR_Enabled /t REG_DWORD /d 0 /f', { 
      stdio: 'ignore',
      shell: true 
    })
    
    console.log('[SystemShortcuts] Game Bar disabled successfully')
    return true
  } catch (error) {
    console.warn('[SystemShortcuts] Failed to disable Game Bar:', error.message)
    return false
  }
}

/**
 * Stop the PrintScreen key from opening the Snipping Tool (Windows 11 22H2+)
 *
 * The low-level hook already swallows VK_SNAPSHOT, but this closes the same
 * door one layer lower so a hook that fails to install does not leave a
 * one-key capture available. The user's previous value is remembered so
 * restore puts their own setting back rather than the Windows default.
 */
let previousSnippingHotkeyValue = null

function disableSnippingHotkey() {
  if (process.platform !== 'win32') return false

  try {
    console.log('[SystemShortcuts] Disabling PrintScreen -> Snipping Tool...')

    // Read first so restore does not have to guess. Missing value means the
    // key has never been touched, which behaves as enabled on Windows 11.
    try {
      const output = execSync('reg query "HKCU\\Control Panel\\Keyboard" /v PrintScreenKeyForSnippingEnabled', {
        stdio: ['ignore', 'pipe', 'ignore'],
        shell: true,
      }).toString()
      const match = output.match(/REG_DWORD\s+0x([0-9a-fA-F]+)/)
      previousSnippingHotkeyValue = match ? parseInt(match[1], 16) : null
    } catch (error) {
      previousSnippingHotkeyValue = null
    }

    execSync('reg add "HKCU\\Control Panel\\Keyboard" /v PrintScreenKeyForSnippingEnabled /t REG_DWORD /d 0 /f', {
      stdio: 'ignore',
      shell: true
    })

    console.log('[SystemShortcuts] PrintScreen -> Snipping Tool disabled successfully')
    return true
  } catch (error) {
    console.warn('[SystemShortcuts] Failed to disable PrintScreen -> Snipping Tool:', error.message)
    return false
  }
}

/**
 * Disable all system shortcuts
 */
function disableAllSystemShortcuts() {
  if (process.platform !== 'win32') {
    console.log('[SystemShortcuts] Not on Windows, skipping')
    return false
  }

  console.log('[SystemShortcuts] Disabling system shortcuts via Registry...')
  
  const results = {
    taskManager: disableTaskManager(),
    lockWorkstation: disableLockWorkstation(),
    gameBar: disableGameBar(),
    snippingHotkey: disableSnippingHotkey()
  }

  const total = Object.keys(results).length
  const successCount = Object.values(results).filter(r => r === true).length
  console.log(`[SystemShortcuts] Disabled ${successCount}/${total} system shortcuts`)
  
  return successCount > 0
}

/**
 * Legacy function - kept for backward compatibility
 */
function disableAltTab() {
  return disableTaskManager()
}

/**
 * Re-enable Task Manager
 */
function enableTaskManager() {
  if (process.platform !== 'win32') return false

  try {
    console.log('[SystemShortcuts] Re-enabling Task Manager...')
    
    execSync('reg delete HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System /v DisableTaskMgr /f', { 
      stdio: 'ignore',
      shell: true 
    })
    
    console.log('[SystemShortcuts] Task Manager re-enabled successfully')
    return true
  } catch (error) {
    console.warn('[SystemShortcuts] Failed to re-enable Task Manager:', error.message)
    return false
  }
}

/**
 * Re-enable Lock Workstation
 */
function enableLockWorkstation() {
  if (process.platform !== 'win32') return false

  try {
    console.log('[SystemShortcuts] Re-enabling Lock Workstation...')
    
    execSync('reg delete HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System /v DisableLockWorkstation /f', { 
      stdio: 'ignore',
      shell: true 
    })
    
    console.log('[SystemShortcuts] Lock Workstation re-enabled successfully')
    return true
  } catch (error) {
    console.warn('[SystemShortcuts] Failed to re-enable Lock Workstation:', error.message)
    return false
  }
}

/**
 * Re-enable Game Bar
 */
function enableGameBar() {
  if (process.platform !== 'win32') return false

  try {
    console.log('[SystemShortcuts] Re-enabling Game Bar...')
    
    execSync('reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR /v AppCaptureEnabled /t REG_DWORD /d 1 /f', { 
      stdio: 'ignore',
      shell: true 
    })
    
    execSync('reg add HKCU\\System\\GameConfigStore /v GameDVR_Enabled /t REG_DWORD /d 1 /f', { 
      stdio: 'ignore',
      shell: true 
    })
    
    console.log('[SystemShortcuts] Game Bar re-enabled successfully')
    return true
  } catch (error) {
    console.warn('[SystemShortcuts] Failed to re-enable Game Bar:', error.message)
    return false
  }
}

/**
 * Restore the PrintScreen key binding the user had before the kiosk started
 */
function enableSnippingHotkey() {
  if (process.platform !== 'win32') return false

  try {
    console.log('[SystemShortcuts] Restoring PrintScreen -> Snipping Tool...')

    if (previousSnippingHotkeyValue === null) {
      // The value did not exist before us, so remove ours rather than
      // inventing one. Deleting a value that is already gone exits non-zero,
      // which the catch below turns into a warning - harmless either way.
      execSync('reg delete "HKCU\\Control Panel\\Keyboard" /v PrintScreenKeyForSnippingEnabled /f', {
        stdio: 'ignore',
        shell: true
      })
    } else {
      execSync(`reg add "HKCU\\Control Panel\\Keyboard" /v PrintScreenKeyForSnippingEnabled /t REG_DWORD /d ${previousSnippingHotkeyValue} /f`, {
        stdio: 'ignore',
        shell: true
      })
    }

    previousSnippingHotkeyValue = null
    console.log('[SystemShortcuts] PrintScreen -> Snipping Tool restored successfully')
    return true
  } catch (error) {
    console.warn('[SystemShortcuts] Failed to restore PrintScreen -> Snipping Tool:', error.message)
    return false
  }
}

/**
 * Re-enable all system shortcuts
 */
function enableAllSystemShortcuts() {
  if (process.platform !== 'win32') {
    console.log('[SystemShortcuts] Not on Windows, skipping')
    return false
  }

  console.log('[SystemShortcuts] Re-enabling system shortcuts...')
  
  const results = {
    taskManager: enableTaskManager(),
    lockWorkstation: enableLockWorkstation(),
    gameBar: enableGameBar(),
    snippingHotkey: enableSnippingHotkey()
  }

  const total = Object.keys(results).length
  const successCount = Object.values(results).filter(r => r === true).length
  console.log(`[SystemShortcuts] Re-enabled ${successCount}/${total} system shortcuts`)
  
  return successCount > 0
}

/**
 * Legacy function - kept for backward compatibility
 */
function enableAltTab() {
  return enableTaskManager()
}

module.exports = {
  // New functions
  disableAllSystemShortcuts,
  enableAllSystemShortcuts,
  disableTaskManager,
  enableTaskManager,
  disableLockWorkstation,
  enableLockWorkstation,
  disableGameBar,
  enableGameBar,
  disableSnippingHotkey,
  enableSnippingHotkey,
  
  // Legacy functions
  disableAltTab,
  enableAltTab,
}
