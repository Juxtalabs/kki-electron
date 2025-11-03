const { session } = require('electron')
const DomainWhitelist = require('./domain-whitelist')
const { getAccessDeniedPopup } = require('../ui/access-denied-popup')

class DomainInterceptor {
  constructor() {
    this.whitelist = new DomainWhitelist()
    this.interceptors = new Map() // Map to track interceptors per session
    this.accessDeniedPopup = getAccessDeniedPopup()
  }

  setupInterceptor(browserSession) {
    console.log('DomainInterceptor: Setting up URL interceptor for session')

    // Store the interceptor reference for this session
    const interceptor = (details, callback) => {
      this.interceptRequest(details, callback)
    }

    // Handle new window creation (prevent new tabs for blocked domains)
    const newWindowHandler = (details, callback) => {
      this.interceptNewWindow(details, callback)
    }

    // Register the interceptors
    browserSession.webRequest.onBeforeRequest(interceptor)
    browserSession.webRequest.onBeforeRequest(newWindowHandler, { urls: ['*://*/*'] })
    
    this.interceptors.set(browserSession, { interceptor, newWindowHandler })

    console.log('DomainInterceptor: URL interceptor registered successfully')
  }

  removeInterceptor(browserSession) {
    const interceptors = this.interceptors.get(browserSession)
    if (interceptors) {
      browserSession.webRequest.onBeforeRequest(null)
      this.interceptors.delete(browserSession)
      console.log('DomainInterceptor: URL interceptor removed')
    }
  }

  interceptRequest(details, callback) {
    const url = details.url
    let host

    try {
      const urlObj = new URL(url)
      host = urlObj.hostname.toLowerCase()
    } catch (error) {
      // Invalid URL, allow it
      console.log('DomainInterceptor: Invalid URL, allowing:', url)
      callback({ cancel: false })
      return
    }

    // Always allow internal protocols
    if (url.startsWith('file://') || 
        url.startsWith('data:') || 
        url.startsWith('blob:') || 
        url.startsWith('chrome-extension:') ||
        url.startsWith('chrome-devtools:') ||
        url.startsWith('devtools://')) {
      callback({ cancel: false })
      return
    }

    // Check if domain is allowed
    const allowed = this.whitelist.isDomainAllowed(host)

    if (!allowed) {
      console.log(`DomainInterceptor: Blocking ${details.resourceType} request to ${url}`)
      
      // Only show popup and block for main frame navigation (user clicks/types URL)
      // Allow all other resource types (images, scripts, css, etc) to load normally
      if (details.resourceType === 'mainFrame') {
        console.log('DomainInterceptor: Showing popup for blocked main frame navigation')
        // Show popup with a small delay to avoid blocking the UI thread
        setTimeout(() => {
          this.accessDeniedPopup.showPopup(host, url)
        }, 100)
        
        callback({ cancel: true })
      } else {
        // Allow background resources to load (don't block images, scripts, etc)
        callback({ cancel: false })
      }
    } else {
      callback({ cancel: false })
    }
  }

  interceptNewWindow(details, callback) {
    const url = details.url
    let host

    try {
      const urlObj = new URL(url)
      host = urlObj.hostname.toLowerCase()
    } catch (error) {
      // Invalid URL, allow it
      callback({ cancel: false })
      return
    }

    // Always allow internal protocols
    if (url.startsWith('file://') || 
        url.startsWith('data:') || 
        url.startsWith('blob:') || 
        url.startsWith('chrome-extension:') ||
        url.startsWith('chrome-devtools:') ||
        url.startsWith('devtools://')) {
      callback({ cancel: false })
      return
    }

    // Check if domain is allowed
    const allowed = this.whitelist.isDomainAllowed(host)

    if (!allowed) {
      console.log(`DomainInterceptor: Blocking new window to ${url}`)
      
      // Show access denied popup for blocked new window attempts
      setTimeout(() => {
        this.accessDeniedPopup.showPopup(host, url)
      }, 100)
      
      callback({ cancel: true })
    } else {
      callback({ cancel: false })
    }
  }

  updateWhitelistedDomains(domains) {
    console.log('DomainInterceptor: Updating whitelisted domains:', domains.length, 'entries')
    
    // Update the whitelist with new domains
    this.whitelist.clearWhitelistedDomains()
    for (const domain of domains) {
      this.whitelist.addWhitelistedDomain(domain)
    }
  }

  addDomain(domain) {
    return this.whitelist.addWhitelistedDomain(domain)
  }

  removeDomain(domain) {
    return this.whitelist.removeWhitelistedDomain(domain)
  }

  getAllowedDomains() {
    return this.whitelist.getAdminWhitelistedDomains()
  }

  isDomainAllowed(domain) {
    return this.whitelist.isDomainAllowed(domain)
  }

  testInterception() {
    console.log('=== TESTING DOMAIN INTERCEPTION ===')
    
    const testUrls = [
      'https://google.com',
      'https://mail.google.com',
      'https://facebook.com',
      'https://github.com',
      'https://api.github.com',
      'https://example.com',
      'https://blocked-site.com'
    ]

    for (const url of testUrls) {
      try {
        const urlObj = new URL(url)
        const host = urlObj.hostname
        const allowed = this.isDomainAllowed(host)
        console.log(`${url}: ${allowed ? 'ALLOWED' : 'BLOCKED'}`)
      } catch (error) {
        console.log(`${url}: INVALID URL`)
      }
    }

    console.log('=== END DOMAIN INTERCEPTION TEST ===')
  }
}

module.exports = DomainInterceptor
