/**
 * Security Configuration
 * 
 * This file contains security-related constants used across the application.
 * All security settings are hardcoded to prevent tampering by end users.
 */

const { VARIANT_CONFIG } = require('./variant')

const SECURITY_CONFIG = {
  // Custom User-Agent identifier for secure communication
  // This should match the ALLOWED_USER_AGENT on the backend (Next.js/Flask)
  ALLOWED_USER_AGENT: 'SecureExamBrowser/Electron2026',

  // Exit code API. This is the authoritative exit password for kiosk mode and is
  // fetched fresh each time the exit prompt is opened.
  EXIT_CODE_URL: VARIANT_CONFIG.exitCodeUrl,
  EXIT_CODE_TOKEN: 'fb584e97-3279-4d37-9b51-79fa1f50357e',

  // Offline fallback exit password, only accepted when the exit code API above
  // can't be reached (no network, server down). Without it an outage would leave
  // the proctor with no way out of the kiosk.
  EXIT_PASSWORD: 'Z8V86FUL',

  // Admin whitelisted domains (full access)
  ADMIN_WHITELISTED_DOMAINS: [
    'portal-ujian-ukom*',
    'portal-ujian-ukom*konsilkesehatanindonesia.id*',
    'kolegium-dokter.kki.go.id*',
    'api-siukomednakes.kki.go.id*',
  ],

  // Regular whitelisted domains (resource access only)
  WHITELISTED_DOMAINS: [
    '*s3.ap-southeast-3.amazonaws.com*',
    '*cloudflare*',
    '*nos.wjv-1.neo.id*',
    '*nos.jkt-1.neo.id*',
    '*api-siukomednakes.kki.go.id*',
    '*unpkg.com*',
  ],

  // Blocked processes that will be automatically killed every 5 seconds.
  // Add process names (e.g., 'WhatsApp.exe', 'Discord.exe'). Matching is
  // case-insensitive, and the macOS killer strips the .exe suffix before
  // matching, so one entry per app covers both platforms.
  BLOCKED_PROCESSES: [
    'WhatsApp.exe',
    'whatsapp.exe',
    'WhatsApp.Root.exe',
    'WhatsApp',

    // Remote control / screen sharing. The session processes
    // (TeamViewer_Desktop, AnyDesk) are the ones that actually capture the
    // screen and inject input, so they matter most; the *_Service entries kill
    // the supervisor that would otherwise respawn them on the next incoming
    // connection.
    'TeamViewer.exe',
    'TeamViewer_Desktop.exe',
    'TeamViewer_Service.exe',
    'TeamViewer_Note.exe',
    'TeamViewerQS.exe',
    'TeamViewerQS_x64.exe',
    'tv_w32.exe',
    'tv_x64.exe',
    'AnyDesk.exe',
    'AnyDeskMSI.exe',
  ]
}

module.exports = { SECURITY_CONFIG }
