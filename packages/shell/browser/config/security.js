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
  ],

  // Signature-based blocking, checked against every running process by image path
  // rather than by process name. Renaming AnyDesk.exe to notepad.exe gets past
  // BLOCKED_PROCESSES above; it does not get past the signing certificate here.
  //
  // Matched case-insensitively as a substring of the Authenticode certificate
  // subject on Windows and of the codesign authority on macOS. Keep the entries
  // specific: a substring this short matching a certificate it was not meant to
  // would kill an unrelated application mid-exam.
  BLOCKED_PUBLISHERS: [
    'TeamViewer',              // TeamViewer Germany GmbH / TeamViewer GmbH
    'philandro Software GmbH', // AnyDesk, original signer
    'AnyDesk Software GmbH',
    'RealVNC',
    'uvnc bvba',               // UltraVNC
    'GlavSoft',                // TightVNC / Remote Utilities
    'LogMeIn',
    'GoTo Technologies',       // GoToAssist, GoToMyPC, Rescue
    'Splashtop',
    'Ammyy',
    'Remote Utilities',
    'NetSupport',
    'Supremo',
    'Nanosystems',             // Supremo publisher
    'Atera Networks',
    'ConnectWise',             // ScreenConnect
    'Devolutions',
    'Purslane Ltd',            // RustDesk
    'Parsec Cloud',
  ],

  // Checked against the PE version resource (CompanyName / ProductName /
  // FileDescription / OriginalFilename) on Windows, and against the codesign
  // bundle identifier on macOS. Not cryptographic - a resource editor can rewrite
  // these - but free to check and it still catches a plain rename.
  BLOCKED_PRODUCTS: [
    'TeamViewer',
    'AnyDesk',
    'UltraVNC',
    'TightVNC',
    'RealVNC',
    'VNC Viewer',
    'VNC Server',
    'Ammyy Admin',
    'Remote Utilities',
    'NetSupport Manager',
    'ScreenConnect',
    'Splashtop',
    'Supremo',
    'RustDesk',
    'Parsec',
    'Chrome Remote Desktop',
    'com.teamviewer',
    'com.philandro.anydesk',
  ],

  // An executable with its signature stripped, running out of Downloads or Temp,
  // is what getting past the tier above actually looks like. Off by default: a
  // student's own unsigned software is not by itself a reason to kill a process,
  // so it is written to the diag log for a proctor to look at instead.
  KILL_UNSIGNED_SUSPICIOUS: false,
}

module.exports = { SECURITY_CONFIG }
