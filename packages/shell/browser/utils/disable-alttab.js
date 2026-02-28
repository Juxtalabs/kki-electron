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
    gameBar: disableGameBar()
  }
  
  const successCount = Object.values(results).filter(r => r === true).length
  console.log(`[SystemShortcuts] Disabled ${successCount}/3 system shortcuts`)
  
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
    gameBar: enableGameBar()
  }
  
  const successCount = Object.values(results).filter(r => r === true).length
  console.log(`[SystemShortcuts] Re-enabled ${successCount}/3 system shortcuts`)
  
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
  
  // Legacy functions
  disableAltTab,
  enableAltTab,
}
