const { app } = require('electron')

/**
 * Monitor Detection Utility
 * 
 * This utility provides functions to detect the number of connected monitors
 * and prevent the browser from running when multiple monitors are detected.
 * This feature can be disabled during development using environment variables.
 */

/**
 * Get the number of connected monitors
 * @returns {number} Number of connected monitors
 */
function getConnectedMonitorCount() {
  // On Windows, we can use process.platform to check and use different methods
  if (process.platform === 'win32') {
    // For Windows, we'll use Electron's screen API which is more reliable
    const { screen } = require('electron')
    const displays = screen.getAllDisplays()
    return displays.length
  }
  
  // For other platforms, fallback to a basic implementation
  const { screen } = require('electron')
  const displays = screen.getAllDisplays()
  return displays.length
}

/**
 * Check if external monitor is connected
 * @returns {boolean} True if more than 1 monitor is detected
 */
function hasExternalMonitorConnected() {
  const count = getConnectedMonitorCount()
  console.log(`Monitor aktif terdeteksi: ${count}`)
  return count > 1
}

/**
 * Check if browser should be blocked due to multiple monitors
 * @returns {boolean} True if browser should be blocked
 */
function shouldBlockBrowser() {
  // Check if monitor detection is disabled (for development)
  if (process.env.DISABLE_MONITOR_CHECK === 'true') {
    console.log('Monitor check disabled - allowing browser to start')
    return false
  }
  
  // Check if in debug mode (development)
  if (process.env.SHELL_DEBUG === 'true') {
    console.log('Debug mode detected - monitor check bypassed')
    return false
  }
  
  return hasExternalMonitorConnected()
}

/**
 * Show monitor warning and exit if multiple monitors detected
 */
function checkAndBlockIfMultipleMonitors() {
  if (shouldBlockBrowser()) {
    console.error('========================================')
    console.error('BROWSER DIBLOKIR - Multiple Monitor Detected')
    console.error('========================================')
    console.error('Browser tidak dapat dijalankan karena terdeteksi lebih dari 1 monitor.')
    console.error('Untuk development, gunakan environment variable:')
    console.error('  DISABLE_MONITOR_CHECK=true untuk menonaktifkan fitur ini')
    console.error('  SHELL_DEBUG=true untuk mode debug')
    console.error('========================================')
    
    // Exit the application
    app.quit()
    return true
  }
  
  return false
}

module.exports = {
  getConnectedMonitorCount,
  hasExternalMonitorConnected,
  shouldBlockBrowser,
  checkAndBlockIfMultipleMonitors
}
