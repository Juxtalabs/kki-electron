/**
 * Security Configuration
 * 
 * This file contains security-related constants used across the application.
 * All security settings are hardcoded to prevent tampering by end users.
 */

const SECURITY_CONFIG = {
  // Custom User-Agent identifier for secure communication
  // This should match the ALLOWED_USER_AGENT on the backend (Next.js/Flask)
  ALLOWED_USER_AGENT: 'SecureExamBrowser/Electron2026',
  
  // Exit password for kiosk mode
  EXIT_PASSWORD: 'Z8V86FUL',
  
  // Admin whitelisted domains (full access)
  ADMIN_WHITELISTED_DOMAINS: [
    'portal-ujian-ukom*',
    'portal-ujian-ukom*konsilkesehatanindonesia.id*'
  ],
  
  // Regular whitelisted domains (resource access only)
  WHITELISTED_DOMAINS: [
    '*s3.ap-southeast-3.amazonaws.com*',
    '*cloudflare*'
  ],
  
  // Blocked processes that will be automatically killed every 5 seconds
  // Add process names (e.g., 'WhatsApp.exe', 'Discord.exe')
  BLOCKED_PROCESSES: [
    'WhatsApp.exe',
    'whatsapp.exe',
    'WhatsApp.Root.exe'
  ]
}

module.exports = { SECURITY_CONFIG }
