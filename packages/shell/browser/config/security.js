/**
 * Security Configuration
 * 
 * This file contains security-related constants used across the application.
 * The custom User-Agent is used to restrict access to the frontend and API
 * so they are only accessible via this specific Electron application.
 */

const SECURITY_CONFIG = {
  // Custom User-Agent identifier for secure communication
  // This should match the ALLOWED_USER_AGENT on the backend (Next.js/Flask)
  ALLOWED_USER_AGENT: 'SecureExamBrowser/Electron2026'
}

module.exports = { SECURITY_CONFIG }
