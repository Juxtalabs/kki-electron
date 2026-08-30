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
  EXIT_PASSWORD: 'OVP249CR',

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
  // case-insensitive and exact - 'chrome.exe' does not match 'chromedriver.exe' -
  // and the macOS killer strips the .exe suffix before matching, so an app that
  // runs on both platforms gets one entry per platform name.
  //
  // Everything under %SystemRoot% is spared unless it is also named in
  // KILLABLE_SYSTEM_PROCESSES below - that is what reaches the copy of Notepad
  // that ships in System32. explorer.exe is deliberately on neither list: the
  // desktop and taskbar stay up.
  BLOCKED_PROCESSES: [
    // --- Messaging ---------------------------------------------------------
    'WhatsApp.exe',
    'whatsapp.exe',
    'WhatsApp.Root.exe',
    'WhatsApp',
    'Discord.exe',
    'Discord',
    'Telegram.exe',
    'Telegram',
    'Slack.exe',
    'Slack',
    'Signal.exe',
    'Signal',
    'LINE.exe',
    'WeChat.exe',
    'Viber.exe',

    // --- Video conferencing ------------------------------------------------
    // Zoom's CptHost and airhost are the screen-share and meeting hosts; kill
    // only Zoom.exe and a screen that is already being shared keeps streaming.
    'Zoom.exe',
    'zoom.us',
    'ZoomLauncher.exe',
    'Zoom_launcher.exe',
    'CptHost.exe',
    'airhost.exe',
    'Teams.exe',
    'ms-teams.exe',
    'msteams.exe',
    'Microsoft Teams',
    'Skype.exe',
    'SkypeApp.exe',
    'Skype',
    'Webex.exe',
    'webexmta.exe',
    'CiscoCollabHost.exe',
    'atmgr.exe',

    // --- Web browsers ------------------------------------------------------
    // The exam runs inside this app; every other engine on the machine is a way
    // out of it. msedgewebview2.exe is the embedded Edge runtime other apps
    // host - it renders arbitrary web content just as well, and nothing in the
    // exam stack uses it.
    'chrome.exe',
    'Google Chrome',
    'msedge.exe',
    'msedgewebview2.exe',
    'Microsoft Edge',
    'firefox.exe',
    'firefox',
    'iexplore.exe',
    'opera.exe',
    'opera_gx.exe',
    'Opera',
    'brave.exe',
    'Brave Browser',
    'vivaldi.exe',
    'Vivaldi',
    'chromium.exe',
    'Chromium',
    'Safari',
    'Arc.exe',
    'Arc',
    'browser.exe', // Yandex Browser
    'yandex.exe',
    'whale.exe',
    'maxthon.exe',
    'ucbrowser.exe',
    'Tor Browser',

    // --- PDF readers -------------------------------------------------------
    // A PDF open beside the exam is a set of notes.
    'Acrobat.exe',
    'AcroRd32.exe',
    'AcroCEF.exe',
    'RdrCEF.exe',
    'Adobe Acrobat',
    'FoxitPDFReader.exe',
    'FoxitReader.exe',
    'FoxitPhantomPDF.exe',
    'SumatraPDF.exe',
    'PDFXEdit.exe',
    'PDFXCview.exe',
    'NitroPDF.exe',
    'NitroPDFReader.exe',
    'PDF24.exe',
    'PDFsam.exe',
    'Preview', // macOS
    'Skim',

    // --- Text editors and viewers ------------------------------------------
    // A .txt of notes open behind the exam is the cheapest cheat there is.
    // notepad.exe and write.exe live under %SystemRoot% on Windows 10 and only
    // die because of KILLABLE_SYSTEM_PROCESSES below; the Windows 11 Store
    // build of Notepad sits in WindowsApps and is reachable either way.
    'notepad.exe',
    'write.exe', // launcher stub for WordPad
    'wordpad.exe',
    'notepad++.exe',
    'Notepad2.exe',
    'Notepad3.exe',
    'sublime_text.exe',
    'Code.exe', // Visual Studio Code - editor, file browser and a terminal
    'Code - Insiders.exe',
    'VSCodium.exe',
    'atom.exe',
    'brackets.exe',
    'gvim.exe',
    'vim.exe',
    'emacs.exe',
    'UltraEdit.exe',
    'EditPlus.exe',
    'PSPad.exe',
    'TextEdit', // macOS
    'BBEdit',
    'Sublime Text',
    'Visual Studio Code',

    // --- Office suites -----------------------------------------------------
    // Documents and spreadsheets hold notes and do the arithmetic; Outlook and
    // OneNote are a message channel on top of that.
    'WINWORD.EXE',
    'EXCEL.EXE',
    'POWERPNT.EXE',
    'ONENOTE.EXE',
    'ONENOTEM.EXE',
    'MSACCESS.EXE',
    'OUTLOOK.EXE',
    'MSPUB.EXE',
    'VISIO.EXE',
    'WINPROJ.EXE',
    'soffice.exe', // LibreOffice / OpenOffice
    'soffice.bin',
    'swriter.exe',
    'scalc.exe',
    'simpress.exe',
    'sdraw.exe',
    'sbase.exe',
    'smath.exe',
    'wps.exe', // WPS Office writer
    'et.exe', // WPS Office spreadsheets - short name, matched exactly
    'wpp.exe', // WPS Office presentations
    'wpsoffice.exe',
    'wpscloudsvr.exe',
    'DesktopEditors.exe', // OnlyOffice
    'TextMaker.exe', // SoftMaker FreeOffice
    'PlanMaker.exe',
    'Presentations.exe',
    'Microsoft Word', // macOS
    'Microsoft Excel',
    'Microsoft PowerPoint',
    'Microsoft OneNote',
    'Microsoft Outlook',
    'Pages',
    'Numbers',
    'Keynote',
    'LibreOffice',

    // --- Remote control / screen sharing -----------------------------------
    // The session processes (TeamViewer_Desktop, AnyDesk) are the ones that
    // actually capture the screen and inject input, so they matter most; the
    // *_Service entries kill the supervisor that would otherwise respawn them
    // on the next incoming connection.
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

  // Names allowed through the %SystemRoot% guard that otherwise spares every
  // Windows component from the sweep. A name here is not killed on its own - it
  // still has to appear in BLOCKED_PROCESSES above; this list only says the
  // guard does not apply to it. Only the name tier honours it, so a hand-edited
  // publisher substring still cannot reach a Windows component by accident.
  //
  // Keep this to accessories the OS does not depend on. Two reasons explorer.exe
  // must never be added: the desktop and taskbar are meant to stay up, and the
  // name tier kills with taskkill /T, which walks the process tree by parent pid
  // - a kiosk started from the desktop is a child of the shell, so killing it
  // that way would take this app down with it.
  KILLABLE_SYSTEM_PROCESSES: [
    'notepad.exe',
    'write.exe',
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

    // Conferencing and messaging
    'Zoom Video Communications',
    'Discord Inc',
    'Slack Technologies',
    'Telegram FZ-LLC',
    'Signal Messenger',

    // Browsers. Vendor names only where the vendor ships nothing else that
    // matters here - 'Google LLC' and 'Microsoft Corporation' are deliberately
    // absent, they sign a great deal more than a browser and a careless hit
    // would take the machine down mid-exam.
    'Mozilla Corporation',
    'Opera Norway',
    'Brave Software',
    'Vivaldi Technologies',

    // PDF readers
    'Foxit Software',
    'Nitro Software',
    'Tracker Software',    // PDF-XChange
    'Krzysztof Kowalczyk', // SumatraPDF

    // Office suites and editors. 'Microsoft Corporation' stays out for the same
    // reason as above - Office is caught by product name instead.
    'Kingsoft', // WPS Office
    'The Document Foundation', // LibreOffice
    'Ascensio System', // OnlyOffice
    'SoftMaker Software',
    'Sublime HQ',
    'Don Ho', // Notepad++
    'IDM Computer Solutions', // UltraEdit
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

    // Browsers
    'Google Chrome',
    'Microsoft Edge',
    'Mozilla Firefox',
    'Opera Browser',
    'Brave Browser',
    'Vivaldi',
    'Yandex Browser',

    // Conferencing and messaging. Zoom's own ProductName is just "Zoom", which
    // is too short to match on safely - the publisher entry above covers it.
    'Microsoft Teams',
    'Skype',
    'Cisco Webex',
    'Discord',
    'Slack',
    'Telegram Desktop',
    'WhatsApp',

    // PDF readers
    'Adobe Acrobat',
    'Foxit PDF Reader',
    'Foxit Reader',
    'SumatraPDF',
    'Nitro PDF',
    'PDF-XChange',

    // Office suites
    'Microsoft Word',
    'Microsoft Excel',
    'Microsoft PowerPoint',
    'Microsoft OneNote',
    'Microsoft Outlook',
    'Microsoft Access',
    'Microsoft Publisher',
    'Microsoft Visio',
    'Microsoft Project',
    'LibreOffice',
    'OpenOffice',
    'WPS Office',
    'Kingsoft Office',
    'ONLYOFFICE',
    'FreeOffice',
    'com.microsoft.Word',
    'com.microsoft.Excel',
    'com.microsoft.Powerpoint',
    'com.apple.iWork',

    // Text editors. Bare 'Notepad' is too short to match on safely - the
    // System32 copy reports itself as Windows anyway, and the name tier is what
    // reaches it.
    'Windows Notepad',
    'Notepad++',
    'Sublime Text',
    'Visual Studio Code',
    'UltraEdit',
    'EditPlus',
    'com.apple.TextEdit',
  ],

  // An executable with its signature stripped, running out of Downloads or Temp,
  // is what getting past the tier above actually looks like. Off by default: a
  // student's own unsigned software is not by itself a reason to kill a process,
  // so it is written to the diag log for a proctor to look at instead.
  KILL_UNSIGNED_SUSPICIOUS: false,
}

module.exports = { SECURITY_CONFIG }
