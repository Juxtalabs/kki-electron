const { spawn, exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const { shell } = require('electron')
const { AppConfigManager } = require('../config/app-config-manager')

/**
 * Generic Application Launcher
 * Handles detection, launching, and fallback for various applications
 */
class GenericAppLauncher {
  constructor() {
    this.configManager = new AppConfigManager()
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Expand environment variables in path
   * @param {string} inputPath - Path with environment variables
   * @returns {string} Expanded path
   */
  expandPath(inputPath) {
    return inputPath.replace(/%([^%]+)%/g, (match, envVar) => {
      return process.env[envVar] || match
    })
  }

  // ==================== DETECTION METHODS ====================

  /**
   * Check if an application is installed
   * @param {string} appId - Application ID from config
   * @returns {Promise<string|null>} Path to executable or null if not found
   */
  async isAppInstalled(appId) {
    const appConfig = this.configManager.getButton(appId)
    if (!appConfig || !appConfig.detection) {
      return null
    }

    // Special handling for Discord
    if (appId === 'discord') {
      return await this.findDiscordExecutable()
    }

    // Generic detection for other apps
    return await this.findGenericExecutable(appConfig)
  }

  /**
   * Generic executable detection for most applications
   * @param {Object} appConfig - Application configuration
   * @returns {Promise<string|null>} Path to executable or null if not found
   */
  async findGenericExecutable(appConfig) {
    const { paths, fallbackCommand } = appConfig.detection

    // Check configured paths
    for (const appPath of paths) {
      try {
        const expandedPath = this.expandPath(appPath)
        
        // Handle wildcard paths (app-*)
        if (expandedPath.includes('app-*')) {
          const result = this.handleWildcardPath(expandedPath)
          if (result) return result
        } else if (fs.existsSync(expandedPath)) {
          return expandedPath
        }
      } catch (error) {
        // Continue to next path
        continue
      }
    }

    // Try fallback command if available
    if (fallbackCommand) {
      return await this.tryFallbackCommand(fallbackCommand, appConfig.id)
    }

    return null
  }

  /**
   * Handle wildcard paths like app-*
   * @param {string} wildcardPath - Path containing wildcards
   * @returns {string|null} Resolved path or null
   */
  handleWildcardPath(wildcardPath) {
    const baseDir = path.dirname(wildcardPath)
    if (!fs.existsSync(baseDir)) return null

    const dirs = fs.readdirSync(baseDir)
    const appDirs = dirs.filter(dir => dir.startsWith('app-'))
    
    if (appDirs.length > 0) {
      // Get the latest version
      const latestAppDir = appDirs.sort().pop()
      const executableName = path.basename(wildcardPath)
      const fullPath = path.join(baseDir, latestAppDir, executableName)
      
      if (fs.existsSync(fullPath)) {
        return fullPath
      }
    }
    
    return null
  }

  /**
   * Try fallback command to find executable
   * @param {string} fallbackCommand - Command to execute
   * @param {string} appId - Application ID
   * @returns {Promise<string|null>} Path to executable or null
   */
  async tryFallbackCommand(fallbackCommand, appId) {
    return new Promise((resolve) => {
      exec(fallbackCommand, (error, stdout) => {
        if (!error && stdout.trim()) {
          const paths = stdout.trim().split('\n')
          const executablePath = paths.find(p => 
            p.toLowerCase().includes(appId.toLowerCase() + '.exe')
          )
          resolve(executablePath || null)
        } else {
          resolve(null)
        }
      })
    })
  }

  /**
   * Special Discord detection method
   * Handles Discord's unique installation structure with versioned folders
   * @returns {Promise<string|null>} Path to Discord executable
   */
  async findDiscordExecutable() {
    const userProfile = process.env.USERPROFILE
    const discordBaseDir = path.join(userProfile, 'AppData', 'Local', 'Discord')
    
    try {
      console.log('Discord Detection: Looking in', discordBaseDir)
      
      if (!fs.existsSync(discordBaseDir)) {
        console.log('Discord Detection: Directory not found')
        return null
      }

      // Try to find Discord.exe in app-* directories
      const discordExePath = this.findDiscordInAppDirectories(discordBaseDir)
      if (discordExePath) {
        console.log('Discord Detection: Found Discord.exe at', discordExePath)
        return discordExePath
      }

      // Fallback to Update.exe method
      const updateExePath = path.join(discordBaseDir, 'Update.exe')
      if (fs.existsSync(updateExePath)) {
        console.log('Discord Detection: Using Update.exe fallback')
        return 'UPDATE_EXE:' + updateExePath
      }

      console.log('Discord Detection: No executable found')
      return null
    } catch (error) {
      console.error('Discord Detection Error:', error)
      return null
    }
  }

  /**
   * Find Discord.exe in app-* directories
   * @param {string} discordBaseDir - Discord base directory
   * @returns {string|null} Path to Discord.exe or null
   */
  findDiscordInAppDirectories(discordBaseDir) {
    try {
      const dirs = fs.readdirSync(discordBaseDir)
      const appDirs = dirs.filter(dir => dir.startsWith('app-'))
      
      if (appDirs.length === 0) {
        console.log('Discord Detection: No app directories found')
        return null
      }

      console.log('Discord Detection: Found app directories:', appDirs)

      // Sort by version number (descending to get latest)
      const latestAppDir = this.sortDiscordVersions(appDirs)[0]
      const discordExePath = path.join(discordBaseDir, latestAppDir, 'Discord.exe')
      
      if (fs.existsSync(discordExePath)) {
        return discordExePath
      }

      return null
    } catch (error) {
      console.error('Error reading Discord app directories:', error)
      return null
    }
  }

  /**
   * Sort Discord version directories by version number
   * @param {string[]} appDirs - Array of app directory names
   * @returns {string[]} Sorted directories (latest first)
   */
  sortDiscordVersions(appDirs) {
    return appDirs.sort((a, b) => {
      const versionA = a.replace('app-', '').split('.').map(Number)
      const versionB = b.replace('app-', '').split('.').map(Number)
      
      for (let i = 0; i < Math.max(versionA.length, versionB.length); i++) {
        const numA = versionA[i] || 0
        const numB = versionB[i] || 0
        if (numA !== numB) return numB - numA // Descending order
      }
      return 0
    })
  }

  // ==================== LAUNCH METHODS ====================

  /**
   * Launch an application
   * @param {string} executablePath - Path to executable or command with arguments
   * @param {Array} args - Command line arguments
   * @returns {Promise<boolean>} Success status
   */
  async launchApp(executablePath, args = []) {
    console.log('App Launch: Starting', executablePath)

    try {
      // Discord Update.exe method
      if (executablePath.startsWith('UPDATE_EXE:')) {
        return await this.launchDiscordViaUpdate(executablePath)
      }

      // Discord.exe direct method
      if (executablePath.includes('Discord.exe')) {
        return await this.launchDiscordDirect(executablePath)
      }

      // Generic application launch
      return await this.launchGenericApp(executablePath, args)

    } catch (error) {
      console.error('App Launch Error:', error)
      return false
    }
  }

  /**
   * Launch Discord via Update.exe
   * @param {string} executablePath - UPDATE_EXE: prefixed path
   * @returns {Promise<boolean>} Success status
   */
  async launchDiscordViaUpdate(executablePath) {
    return new Promise((resolve) => {
      const updateExePath = executablePath.replace('UPDATE_EXE:', '')
      console.log('Discord Launch: Using Update.exe method')

      exec(`"${updateExePath}" --processStart Discord.exe`, (error, stdout, stderr) => {
        if (error) {
          console.error('Discord Launch: Update.exe failed', error.message)
          if (stderr) console.error('Discord Launch: stderr', stderr)
          resolve(false)
        } else {
          console.log('Discord Launch: Update.exe successful')
          resolve(true)
        }
      })
    })
  }

  /**
   * Launch Discord.exe directly
   * @param {string} executablePath - Path to Discord.exe
   * @returns {Promise<boolean>} Success status
   */
  async launchDiscordDirect(executablePath) {
    return new Promise((resolve) => {
      console.log('Discord Launch: Direct Discord.exe method')

      exec(`"${executablePath}"`, (error, stdout, stderr) => {
        if (error) {
          console.error('Discord Launch: Direct failed', error.message)
          if (stderr) console.error('Discord Launch: stderr', stderr)
          resolve(false)
        } else {
          console.log('Discord Launch: Direct successful')
          resolve(true)
        }
      })
    })
  }

  /**
   * Launch generic application using spawn
   * @param {string} executablePath - Path to executable
   * @param {Array} args - Command line arguments
   * @returns {Promise<boolean>} Success status
   */
  async launchGenericApp(executablePath, args = []) {
    return new Promise((resolve) => {
      console.log('Generic Launch: Using spawn method')

      const { command, commandArgs } = this.parseExecutablePath(executablePath, args)
      
      const appProcess = spawn(command, commandArgs, {
        detached: true,
        stdio: 'ignore'
      })

      appProcess.unref()
      
      appProcess.on('error', (error) => {
        console.error('Generic Launch: Spawn failed', error.message)
        resolve(false)
      })

      appProcess.on('spawn', () => {
        console.log('Generic Launch: Spawn successful')
        resolve(true)
      })

      // Fallback timeout
      setTimeout(() => {
        if (!appProcess.killed) {
          console.log('Generic Launch: Timeout - assuming success')
          resolve(true)
        }
      }, 2000)
    })
  }

  /**
   * Parse executable path and arguments
   * @param {string} executablePath - Path to executable
   * @param {Array} args - Additional arguments
   * @returns {Object} Parsed command and arguments
   */
  parseExecutablePath(executablePath, args = []) {
    if (executablePath.includes(' --')) {
      const parts = executablePath.split(' ')
      return {
        command: parts[0],
        commandArgs: parts.slice(1).concat(args)
      }
    }
    
    return {
      command: executablePath,
      commandArgs: args
    }
  }

  // ==================== FALLBACK & MAIN METHODS ====================

  /**
   * Handle fallback action (usually opening installer URL)
   * @param {Object} fallbackConfig - Fallback configuration
   * @returns {Promise<boolean>} Success status
   */
  async handleFallback(fallbackConfig) {
    try {
      console.log('Fallback: Executing', fallbackConfig.type)
      
      if (fallbackConfig.type === 'url') {
        // Open URL in Electron browser instead of external browser
        await this.openUrlInElectronBrowser(fallbackConfig.url)
        console.log('Fallback: URL opened in Electron browser')
        return true
      }
      
      console.log('Fallback: Unsupported type', fallbackConfig.type)
      return false
    } catch (error) {
      console.error('Fallback Error:', error)
      return false
    }
  }

  /**
   * Open URL in Electron browser instead of external browser
   * @param {string} url - URL to open
   * @returns {Promise<void>}
   */
  async openUrlInElectronBrowser(url) {
    try {
      // Use chrome.tabs API to create new tab in Electron browser
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({ url: url })
        console.log('Fallback: Created new tab with URL:', url)
      } else {
        // Fallback: try to get current window and navigate
        const { BrowserWindow } = require('electron')
        const focusedWindow = BrowserWindow.getFocusedWindow()
        
        if (focusedWindow) {
          // Create new tab by sending message to renderer
          focusedWindow.webContents.executeJavaScript(`
            if (typeof chrome !== 'undefined' && chrome.tabs) {
              chrome.tabs.create({ url: '${url}' });
            }
          `)
          console.log('Fallback: Executed tab creation in renderer')
        } else {
          console.warn('Fallback: No focused window found, using external browser')
          await shell.openExternal(url)
        }
      }
    } catch (error) {
      console.error('Fallback: Failed to open in Electron browser, using external:', error)
      // Fallback to external browser if internal method fails
      await shell.openExternal(url)
    }
  }

  /**
   * Main function to handle app button click
   * @param {string} appId - Application ID from config
   * @returns {Promise<{success: boolean, action: string, message: string}>}
   */
  async handleAppClick(appId) {
    try {
      console.log(`App Click: ${appId}`)
      
      // Validate configuration
      const appConfig = this.configManager.getButton(appId)
      if (!appConfig) {
        return this.createErrorResponse('config_not_found', `Configuration for ${appId} not found`)
      }

      if (!appConfig.enabled) {
        return this.createErrorResponse('app_disabled', `${appConfig.name} is disabled in configuration`)
      }

      // Try to detect and launch application
      const executablePath = await this.isAppInstalled(appId)
      
      if (executablePath) {
        return await this.attemptLaunch(appConfig, executablePath)
      } else {
        return await this.attemptFallback(appConfig)
      }

    } catch (error) {
      console.error('App Click Error:', error)
      return this.createErrorResponse('error', `Error: ${error.message}`)
    }
  }

  /**
   * Attempt to launch the application
   * @param {Object} appConfig - Application configuration
   * @param {string} executablePath - Path to executable
   * @returns {Promise<Object>} Launch result
   */
  async attemptLaunch(appConfig, executablePath) {
    console.log(`${appConfig.name} found at:`, executablePath)
    
    const launched = await this.launchApp(executablePath, appConfig.launch.arguments || [])
    
    if (launched) {
      return {
        success: true,
        action: 'launched',
        message: `${appConfig.name} launched successfully`
      }
    } else {
      return this.createErrorResponse('launch_failed', `Failed to launch ${appConfig.name}`)
    }
  }

  /**
   * Attempt fallback when application not found
   * @param {Object} appConfig - Application configuration
   * @returns {Promise<Object>} Fallback result
   */
  async attemptFallback(appConfig) {
    console.log(`${appConfig.name} not found - handling fallback`)
    
    if (!appConfig.fallback) {
      return this.createErrorResponse('not_found_no_fallback', 
        `${appConfig.name} not found and no fallback configured`)
    }

    const fallbackSuccess = await this.handleFallback(appConfig.fallback)
    
    if (fallbackSuccess) {
      return {
        success: true,
        action: 'fallback_executed',
        message: appConfig.fallback.message || `${appConfig.name} installer opened`
      }
    } else {
      return this.createErrorResponse('fallback_failed', `Failed to open ${appConfig.name} installer`)
    }
  }

  /**
   * Create standardized error response
   * @param {string} action - Error action type
   * @param {string} message - Error message
   * @returns {Object} Error response object
   */
  createErrorResponse(action, message) {
    return {
      success: false,
      action,
      message
    }
  }

  // ==================== PUBLIC API METHODS ====================

  /**
   * Get all enabled app configurations for UI
   * @returns {Array} Array of enabled app button configurations
   */
  getEnabledApps() {
    return this.configManager.getEnabledButtons()
  }

  /**
   * Reload configuration
   */
  reloadConfig() {
    this.configManager.reloadConfig()
  }
}

module.exports = { GenericAppLauncher }
