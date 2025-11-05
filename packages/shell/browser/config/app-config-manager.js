const fs = require('fs')
const path = require('path')

class AppConfigManager {
  constructor() {
    this.configPath = path.join(__dirname, 'app-buttons.json')
    this.config = null
    this.loadConfig()
  }

  /**
   * Load configuration from JSON file
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8')
        this.config = JSON.parse(configData)
        console.log('App buttons config loaded successfully')
      } else {
        console.warn('App buttons config file not found, using default empty config')
        this.config = { appButtons: [] }
      }
    } catch (error) {
      console.error('Failed to load app buttons config:', error)
      this.config = { appButtons: [] }
    }
  }

  /**
   * Save configuration to JSON file
   */
  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2))
      console.log('App buttons config saved successfully')
      return true
    } catch (error) {
      console.error('Failed to save app buttons config:', error)
      return false
    }
  }

  /**
   * Get all enabled app buttons
   * @returns {Array} Array of enabled app button configurations
   */
  getEnabledButtons() {
    if (!this.config || !this.config.appButtons) {
      return []
    }
    return this.config.appButtons.filter(button => button.enabled === true)
  }

  /**
   * Get all app buttons (enabled and disabled)
   * @returns {Array} Array of all app button configurations
   */
  getAllButtons() {
    if (!this.config || !this.config.appButtons) {
      return []
    }
    return this.config.appButtons
  }

  /**
   * Get specific button configuration by ID
   * @param {string} buttonId - Button ID to find
   * @returns {Object|null} Button configuration or null if not found
   */
  getButton(buttonId) {
    if (!this.config || !this.config.appButtons) {
      return null
    }
    return this.config.appButtons.find(button => button.id === buttonId) || null
  }

  /**
   * Add new button configuration
   * @param {Object} buttonConfig - Button configuration object
   * @returns {boolean} Success status
   */
  addButton(buttonConfig) {
    try {
      if (!this.config) {
        this.config = { appButtons: [] }
      }
      
      // Check if button with same ID already exists
      const existingIndex = this.config.appButtons.findIndex(btn => btn.id === buttonConfig.id)
      if (existingIndex !== -1) {
        console.warn(`Button with ID '${buttonConfig.id}' already exists`)
        return false
      }

      this.config.appButtons.push(buttonConfig)
      return this.saveConfig()
    } catch (error) {
      console.error('Failed to add button:', error)
      return false
    }
  }

  /**
   * Update existing button configuration
   * @param {string} buttonId - Button ID to update
   * @param {Object} updates - Updates to apply
   * @returns {boolean} Success status
   */
  updateButton(buttonId, updates) {
    try {
      if (!this.config || !this.config.appButtons) {
        return false
      }

      const buttonIndex = this.config.appButtons.findIndex(btn => btn.id === buttonId)
      if (buttonIndex === -1) {
        console.warn(`Button with ID '${buttonId}' not found`)
        return false
      }

      // Merge updates with existing configuration
      this.config.appButtons[buttonIndex] = {
        ...this.config.appButtons[buttonIndex],
        ...updates
      }

      return this.saveConfig()
    } catch (error) {
      console.error('Failed to update button:', error)
      return false
    }
  }

  /**
   * Enable or disable a button
   * @param {string} buttonId - Button ID
   * @param {boolean} enabled - Enable status
   * @returns {boolean} Success status
   */
  setButtonEnabled(buttonId, enabled) {
    return this.updateButton(buttonId, { enabled })
  }

  /**
   * Remove button configuration
   * @param {string} buttonId - Button ID to remove
   * @returns {boolean} Success status
   */
  removeButton(buttonId) {
    try {
      if (!this.config || !this.config.appButtons) {
        return false
      }

      const buttonIndex = this.config.appButtons.findIndex(btn => btn.id === buttonId)
      if (buttonIndex === -1) {
        console.warn(`Button with ID '${buttonId}' not found`)
        return false
      }

      this.config.appButtons.splice(buttonIndex, 1)
      return this.saveConfig()
    } catch (error) {
      console.error('Failed to remove button:', error)
      return false
    }
  }

  /**
   * Reload configuration from file
   */
  reloadConfig() {
    this.loadConfig()
  }

  /**
   * Expand environment variables in paths
   * @param {string} path - Path with environment variables
   * @returns {string} Expanded path
   */
  expandPath(path) {
    return path.replace(/%([^%]+)%/g, (match, envVar) => {
      return process.env[envVar] || match
    })
  }

  /**
   * Get expanded paths for a button
   * @param {string} buttonId - Button ID
   * @returns {Array} Array of expanded paths
   */
  getExpandedPaths(buttonId) {
    const button = this.getButton(buttonId)
    if (!button || !button.detection || !button.detection.paths) {
      return []
    }

    return button.detection.paths.map(path => this.expandPath(path))
  }
}

module.exports = { AppConfigManager }
