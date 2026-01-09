const fs = require('fs')
const path = require('path')
const { ROOT_DIR } = require('../config/paths')

class DomainWhitelist {
  constructor() {
    this.config = null
    // Try multiple possible config locations
    const possiblePaths = [
      // Primary: browser config (source tree)
      path.join(ROOT_DIR, 'packages/shell/browser/config/config.json'),
      // Fallback: relative to bundled .webpack/main location
      path.join(__dirname, '../config/config.json')
    ]
    
    this.configPath = this.findConfigFile(possiblePaths)
    this.loadConfig()
  }

  findConfigFile(paths) {
    for (const configPath of paths) {
      if (fs.existsSync(configPath)) {
        console.log(`DomainWhitelist: Found config at ${configPath}`)
        return configPath
      }
    }
    console.log('DomainWhitelist: Config file not found, will use default')
    return paths[0] // fallback to first option
  }

  loadConfig() {
    console.log('DomainWhitelist: Loading configuration from file')
    
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8')
        this.config = JSON.parse(configData)
        console.log('DomainWhitelist: Configuration loaded from file successfully')
      } else {
        console.warn('DomainWhitelist: Config file not found at:', this.configPath)
        console.warn('DomainWhitelist: Falling back to default in-memory configuration')
        this.config = {
          security: {
            admin_whitelisted_domains: [],
            whitelisted_domains: [],
          },
        }
      }
    } catch (error) {
      console.error('DomainWhitelist: Failed to load config from file, using default config:', error.message)
      if (!this.config) {
        this.config = {
          security: {
            admin_whitelisted_domains: [],
            whitelisted_domains: [],
          },
        }
      }
    }
  }

  matchesDomainPattern(domain, pattern) {
    // Normalize both domain and pattern to lowercase for case-insensitive matching
    const normalizedDomain = domain.toLowerCase()
    const normalizedPattern = pattern.toLowerCase()

    // Handle universal wildcard
    if (normalizedPattern === '*') {
      return true
    }

    // Handle wildcard patterns with * on both sides FIRST (most specific)
    if (normalizedPattern.startsWith('*') && normalizedPattern.endsWith('*')) {
      const middle = normalizedPattern.slice(1, -1) // Remove "*" from both sides
      if (middle.isEmpty) {
        return true // "*" matches everything
      }
      return normalizedDomain.includes(middle)
    }

    // Handle traditional wildcard patterns (for backward compatibility)
    if (normalizedPattern.startsWith('*.')) {
      const baseDomain = normalizedPattern.slice(2) // Remove "*."
      return normalizedDomain === baseDomain || normalizedDomain.endsWith('.' + baseDomain)
    }

    // Handle loose wildcard patterns like *.google.*
    if (normalizedPattern.startsWith('*.') && normalizedPattern.endsWith('.*')) {
      const baseDomain = normalizedPattern.slice(2, -2) // Remove "*." and ".*"
      return normalizedDomain.includes(baseDomain)
    }

    // Handle wildcard patterns starting with * (but not ending with *)
    if (normalizedPattern.startsWith('*')) {
      const suffix = normalizedPattern.slice(1) // Remove "*"
      if (suffix.isEmpty) {
        return true // "*" matches everything
      }
      return normalizedDomain.endsWith(suffix)
    }

    // Handle wildcard patterns ending with * (but not starting with *)
    if (normalizedPattern.endsWith('*')) {
      const prefix = normalizedPattern.slice(0, -1) // Remove "*"
      if (prefix.isEmpty) {
        return true // "*" matches everything
      }
      return normalizedDomain.startsWith(prefix)
    }

    // Exact match
    return normalizedDomain === normalizedPattern
  }

  isDomainAllowed(domain) {
    if (!domain) {
      return false
    }

    // Normalize domain for consistent matching
    const normalizedDomain = domain.toLowerCase().trim()

    // Get all domain lists
    const whitelistedDomains = this.getWhitelistedDomains()
    const adminWhitelistedDomains = this.getAdminWhitelistedDomains()

    console.log(`=== DOMAIN CHECK FOR: ${normalizedDomain} ===`)
    console.log('Whitelisted domains:', whitelistedDomains)
    console.log('Admin whitelisted domains:', adminWhitelistedDomains)

    // Check if admin whitelisted (highest priority)
    for (const whitelistedPattern of adminWhitelistedDomains) {
      if (this.matchesDomainPattern(normalizedDomain, whitelistedPattern)) {
        console.log(`Domain ${normalizedDomain} ALLOWED by admin whitelist pattern: ${whitelistedPattern}`)
        return true
      }
    }

    // Check if whitelisted
    for (const whitelistedPattern of whitelistedDomains) {
      if (this.matchesDomainPattern(normalizedDomain, whitelistedPattern)) {
        console.log(`Domain ${normalizedDomain} ALLOWED by whitelist pattern: ${whitelistedPattern}`)
        return true
      }
    }

    // Domain is not in any whitelist
    console.log(`Domain ${normalizedDomain} BLOCKED - not in any whitelist`)
    console.log('=== END DOMAIN CHECK ===')
    return false
  }

  getWhitelistedDomains() {
    if (!this.config || !this.config.security) {
      return []
    }
    return this.config.security.whitelisted_domains || []
  }

  getAdminWhitelistedDomains() {
    if (!this.config || !this.config.security) {
      return []
    }
    const domains = this.config.security.admin_whitelisted_domains || []
    console.log(`DomainWhitelist: Admin whitelisted domains: ${domains.length} entries`)
    return domains
  }

  addWhitelistedDomain(domain) {
    if (!domain) {
      return false
    }

    if (!this.config.security) {
      this.config.security = {}
    }

    if (!this.config.security.admin_whitelisted_domains) {
      this.config.security.admin_whitelisted_domains = []
    }

    const adminWhitelistedDomains = this.config.security.admin_whitelisted_domains

    // Check if domain already exists
    if (adminWhitelistedDomains.includes(domain)) {
      console.log(`DomainWhitelist: Domain ${domain} already in admin whitelist`)
      return true
    }

    // Add the domain
    adminWhitelistedDomains.push(domain)
    this.saveConfig()
    
    console.log(`DomainWhitelist: Added domain ${domain} to admin whitelist`)
    return true
  }

  removeWhitelistedDomain(domain) {
    if (!domain) {
      return false
    }

    if (!this.config.security || !this.config.security.admin_whitelisted_domains) {
      console.log(`DomainWhitelist: Domain ${domain} not found in admin whitelist`)
      return false
    }

    const adminWhitelistedDomains = this.config.security.admin_whitelisted_domains
    const index = adminWhitelistedDomains.indexOf(domain)

    if (index === -1) {
      console.log(`DomainWhitelist: Domain ${domain} not found in admin whitelist`)
      return false
    }

    adminWhitelistedDomains.splice(index, 1)
    this.saveConfig()
    
    console.log(`DomainWhitelist: Removed domain ${domain} from admin whitelist`)
    return true
  }

  clearWhitelistedDomains() {
    console.log('DomainWhitelist: Clearing all whitelisted domains')

    if (this.config.security) {
      // Clear admin whitelisted domains
      if (this.config.security.admin_whitelisted_domains) {
        this.config.security.admin_whitelisted_domains = []
        console.log('Cleared admin_whitelisted_domains')
      }

      // Clear regular whitelisted domains
      if (this.config.security.whitelisted_domains) {
        this.config.security.whitelisted_domains = []
        console.log('Cleared whitelisted_domains')
      }

      this.saveConfig()
    }

    console.log('DomainWhitelist: All whitelisted domains cleared')
  }

  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8')
      console.log('DomainWhitelist: Configuration saved successfully')
    } catch (error) {
      console.error('DomainWhitelist: Failed to save config:', error.message)
    }
  }

  testWhitelistingSystem() {
    console.log('=== TESTING WHITELISTING SYSTEM ===')

    // Test current whitelist configuration
    console.log('Current whitelist configuration:')
    console.log('Admin whitelisted domains:', this.getAdminWhitelistedDomains())
    console.log('Regular whitelisted domains:', this.getWhitelistedDomains())

    // Test domain checking
    const testDomains = ['google.com', 'mail.google.com', 'facebook.com', '*.github.com', 'test.com']

    for (const domain of testDomains) {
      const allowed = this.isDomainAllowed(domain)
      console.log(`Domain ${domain}: ${allowed ? 'ALLOWED' : 'BLOCKED'}`)
    }

    console.log('=== END WHITELISTING SYSTEM TEST ===')
  }
}

module.exports = DomainWhitelist
