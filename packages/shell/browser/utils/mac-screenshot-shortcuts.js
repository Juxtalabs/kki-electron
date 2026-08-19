// Turn off the macOS screen capture keyboard shortcuts (Cmd+Shift+3/4/5/6).
//
// On macOS these are owned by WindowServer, which consumes them before any
// application sees the keystroke. globalShortcut.register() fails on them and
// before-input-event never fires, so the only way to stop them is to disable the
// hotkeys themselves in com.apple.symbolichotkeys - the same store the Keyboard
// pane of System Settings writes to. No admin privileges required; it is all in
// the student's own preference domain.
//
// This is the macOS counterpart to the registry work in disable-alttab.js, and
// like it, it is defence in depth: setContentProtection() in Browser.createWindow
// is what actually guarantees a blank capture. Someone can still run
// /usr/sbin/screencapture from a terminal, and that is fine - the window is
// excluded from the result either way.
//
// The whole AppleSymbolicHotKeys dictionary is read, edited and written back in
// one piece. Editing it wholesale is what makes restore exact: entries we never
// touched are carried through verbatim, and an entry that did not exist before us
// is removed rather than guessed at on the way out.

const { execFileSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const diag = require('./diag-log')
const log = (message, data) => diag.write('MacScreenshotKeys', message, data)
const warn = (message, data) => diag.write('MacScreenshotKeys', `WARN ${message}`, data)

// Absolute paths so a binary planted earlier in PATH cannot be used instead
const DEFAULTS = '/usr/bin/defaults'
const PLUTIL = '/usr/bin/plutil'
const ACTIVATE_SETTINGS =
  '/System/Library/PrivateFrameworks/SystemAdministration.framework/Resources/activateSettings'

const DOMAIN = 'com.apple.symbolichotkeys'
const HOTKEYS_KEY = 'AppleSymbolicHotKeys'

// AppleSymbolicHotKeys identifiers for the screen capture family. The ids are
// stable across macOS releases; the labels are only for the diagnostic log.
const SCREENSHOT_HOTKEYS = {
  28: 'Cmd+Shift+3 - whole screen to file',
  29: 'Ctrl+Cmd+Shift+3 - whole screen to clipboard',
  30: 'Cmd+Shift+4 - selection to file',
  31: 'Ctrl+Cmd+Shift+4 - selection to clipboard',
  181: 'Cmd+Shift+6 - Touch Bar to file',
  182: 'Ctrl+Cmd+Shift+6 - Touch Bar to clipboard',
  184: 'Cmd+Shift+5 - screenshot and recording options',
}

const BACKUP_FILENAME = 'mac-screenshot-shortcuts-backup.json'

let backup = null

function backupFilePath() {
  try {
    const { app } = require('electron')
    return path.join(app.getPath('userData'), BACKUP_FILENAME)
  } catch (error) {
    return null
  }
}

/**
 * Serialise a JSON value as an XML property list fragment.
 *
 * `defaults write` takes a plist string for the value, and the entries we write
 * back are the ones we read, so this only has to cover what plutil hands us:
 * dictionaries, arrays, strings, numbers and booleans.
 */
function toPlist(value) {
  if (typeof value === 'boolean') return value ? '<true/>' : '<false/>'

  if (typeof value === 'number') {
    return Number.isInteger(value) ? `<integer>${value}</integer>` : `<real>${value}</real>`
  }

  if (typeof value === 'string') return `<string>${escapeXml(value)}</string>`

  if (Array.isArray(value)) {
    return `<array>${value.map(toPlist).join('')}</array>`
  }

  if (value && typeof value === 'object') {
    const body = Object.entries(value)
      .map(([key, entry]) => `<key>${escapeXml(key)}</key>${toPlist(entry)}`)
      .join('')
    return `<dict>${body}</dict>`
  }

  // null / undefined have no plist equivalent - callers drop these keys instead
  return '<string></string>'
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Read the whole AppleSymbolicHotKeys dictionary as plain JSON.
 *
 * `defaults read` prints the old-style plist format, which is awkward to parse,
 * so the domain is exported as XML and run through plutil to get JSON.
 *
 * Returns {} when the domain exists but holds no hotkeys - the case on an account
 * where no keyboard shortcut has ever been customised - and null when the read
 * itself failed. Callers must treat those two differently: we write the whole
 * dictionary back in one piece, so mistaking "could not read" for "nothing there"
 * would drop every other shortcut the student has customised.
 */
function readHotkeys() {
  let xml

  try {
    xml = execFileSync(DEFAULTS, ['export', DOMAIN, '-'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch (error) {
    warn('Failed to export the hotkey domain:', error.message)
    return null
  }

  try {
    const json = execFileSync(PLUTIL, ['-convert', 'json', '-o', '-', '-'], {
      input: xml,
      stdio: ['pipe', 'pipe', 'ignore'],
    }).toString()

    const parsed = JSON.parse(json)
    if (!parsed || typeof parsed !== 'object') return null

    const hotkeys = parsed[HOTKEYS_KEY]
    // Domain present but no hotkeys stored in it yet
    if (hotkeys === undefined) return {}

    return hotkeys && typeof hotkeys === 'object' ? hotkeys : null
  } catch (error) {
    warn('Failed to parse the hotkey domain:', error.message)
    return null
  }
}

function writeHotkeys(hotkeys) {
  execFileSync(DEFAULTS, ['write', DOMAIN, HOTKEYS_KEY, toPlist(hotkeys)], { stdio: 'ignore' })
}

/**
 * Make the change take effect without a logout.
 *
 * WindowServer caches the hotkey table at login, so writing the preference is
 * not enough on its own.
 */
function activateSettings() {
  try {
    execFileSync(ACTIVATE_SETTINGS, ['-u'], { stdio: 'ignore' })
    return true
  } catch (error) {
    warn('activateSettings failed - change applies at next login:', error.message)
    return false
  }
}

function saveBackupFile(data) {
  const file = backupFilePath()
  if (!file) return

  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2))
  } catch (error) {
    warn('Failed to persist backup:', error.message)
  }
}

function readBackupFile() {
  const file = backupFilePath()
  if (!file) return null

  try {
    if (!fs.existsSync(file)) return null
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    warn('Failed to read backup file:', error.message)
    return null
  }
}

function clearBackupFile() {
  const file = backupFilePath()
  if (!file) return

  try {
    if (fs.existsSync(file)) fs.unlinkSync(file)
  } catch (error) {
    warn('Failed to clear backup file:', error.message)
  }
}

/**
 * Report which screenshot hotkeys are currently enabled, for the diag log.
 */
function readCurrentState() {
  if (process.platform !== 'darwin') return null

  const current = readHotkeys()
  if (!current) return null

  const state = {}

  Object.keys(SCREENSHOT_HOTKEYS).forEach((id) => {
    const entry = current[id]
    // An id with no entry of its own uses the Apple default, which is enabled
    state[id] = entry ? entry.enabled !== false && entry.enabled !== 0 : true
  })

  return state
}

/**
 * Put back settings left behind by a previous run that crashed before cleanup.
 * Safe to call on every startup - a no-op when no stale backup exists.
 */
function restoreStaleBackup() {
  if (process.platform !== 'darwin') return false

  const stale = readBackupFile()
  if (!stale) return false

  log('Found backup from a previous session, restoring first')
  backup = stale
  return restore()
}

/**
 * Disable the screen capture shortcuts.
 */
function disable() {
  if (process.platform !== 'darwin') {
    log('Not on macOS, skipping')
    return false
  }

  if (backup) {
    log('Already disabled')
    return true
  }

  log('Disabling macOS screen capture shortcuts...')

  const current = readHotkeys()
  if (!current) {
    // Writing now would replace the whole dictionary with just our seven ids and
    // take every other customised shortcut with it. Leaving the shortcuts on is
    // the lesser problem - setContentProtection still blanks the capture.
    warn('Could not read current hotkeys, leaving them alone')
    return false
  }

  const snapshot = {}
  const next = { ...current }

  Object.keys(SCREENSHOT_HOTKEYS).forEach((id) => {
    // null records "this id had no entry of its own", so restore removes ours
    // rather than inventing a key binding the student never had.
    snapshot[id] = Object.prototype.hasOwnProperty.call(current, id) ? current[id] : null

    // Keep the existing `value` so the binding survives being switched off - it
    // is what restore hands back, and what System Settings shows in the meantime.
    const existing = current[id]
    next[id] =
      existing && typeof existing === 'object' ? { ...existing, enabled: false } : { enabled: false }
  })

  try {
    writeHotkeys(next)
  } catch (error) {
    warn('Failed to write hotkey settings:', error.message)
    return false
  }

  backup = snapshot
  saveBackupFile(snapshot)

  activateSettings()

  log(`Disabled ${Object.keys(SCREENSHOT_HOTKEYS).length} screen capture shortcuts`)
  log('State now:', readCurrentState())

  return true
}

/**
 * Put the student's own screenshot shortcuts back.
 */
function restore() {
  if (process.platform !== 'darwin') return false

  if (!backup) {
    log('Nothing to restore')
    return true
  }

  log('Restoring macOS screen capture shortcuts...')

  const current = readHotkeys()
  if (!current) {
    // Keep `backup` and the backup file so restoreStaleBackup() has another go
    // on the next launch rather than leaving the student switched off for good.
    warn('Could not read current hotkeys, keeping the backup for the next launch')
    return false
  }

  const next = { ...current }

  Object.entries(backup).forEach(([id, entry]) => {
    if (entry === null || entry === undefined) {
      delete next[id]
    } else {
      next[id] = entry
    }
  })

  try {
    writeHotkeys(next)
  } catch (error) {
    warn('Failed to restore hotkey settings:', error.message)
    return false
  }

  backup = null
  clearBackupFile()

  activateSettings()

  log('Screen capture shortcuts restored')
  return true
}

module.exports = {
  disable,
  restore,
  restoreStaleBackup,
  readCurrentState,
  // exported for testing
  toPlist,
  SCREENSHOT_HOTKEYS,
}
