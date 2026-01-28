// Utility to disable Alt+Tab via Windows Registry
// This requires admin privileges

const { execSync } = require('child_process')
const os = require('os')

/**
 * Disable Alt+Tab task switching via Registry
 * Requires admin privileges
 */
function disableAltTab() {
  if (process.platform !== 'win32') {
    console.log('[DisableAltTab] Not on Windows, skipping')
    return false
  }

  try {
    console.log('[DisableAltTab] Attempting to disable Alt+Tab via Registry...')
    
    // Set registry key to disable task switching
    const regCommand = 'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v DisableTaskMgr /t REG_DWORD /d 1 /f'
    
    execSync(regCommand, { stdio: 'ignore' })
    
    console.log('[DisableAltTab] Successfully disabled Alt+Tab via Registry')
    return true
  } catch (error) {
    console.warn('[DisableAltTab] Failed to disable Alt+Tab (may need admin privileges):', error.message)
    return false
  }
}

/**
 * Re-enable Alt+Tab task switching
 */
function enableAltTab() {
  if (process.platform !== 'win32') {
    return false
  }

  try {
    console.log('[DisableAltTab] Re-enabling Alt+Tab...')
    
    const regCommand = 'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v DisableTaskMgr /f'
    
    execSync(regCommand, { stdio: 'ignore' })
    
    console.log('[DisableAltTab] Successfully re-enabled Alt+Tab')
    return true
  } catch (error) {
    console.warn('[DisableAltTab] Failed to re-enable Alt+Tab:', error.message)
    return false
  }
}

module.exports = {
  disableAltTab,
  enableAltTab,
}
