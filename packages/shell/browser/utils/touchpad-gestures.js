// Disable Windows Precision Touchpad multi-finger gestures (3/4 finger swipe).
//
// On Windows the 3-finger swipe is handled by the shell, not by the focused app,
// so an Electron window cannot swallow it. The only way to stop it at the source
// is to turn the gesture off in the per-user Precision Touchpad settings, which is
// what the Settings app writes to. No admin privileges required.
//
// Writing the values is not enough on its own: the shell caches gesture settings at
// logon, so explorer.exe is restarted afterwards to make the change take effect
// without a sign-out. Verified on this hardware - the swipe kept switching windows
// with the values already at 0, and stopped the moment explorer was restarted.
//
// Original values are backed up in memory and mirrored to a file in userData so a
// crashed kiosk still restores the student's own settings on the next launch.

// reg.exe is called without a shell so the backslashes in the key path survive
const { execFileSync } = require('child_process')
const path = require('path')
const fs = require('fs')

// Absolute path so a reg.exe planted earlier in PATH can't be used instead
const REG_EXE = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'reg.exe')

const SYSTEM32 = path.join(process.env.SystemRoot || 'C:\Windows', 'System32')
const TASKKILL_EXE = path.join(SYSTEM32, 'taskkill.exe')
const TASKLIST_EXE = path.join(SYSTEM32, 'tasklist.exe')
const EXPLORER_EXE = path.join(process.env.SystemRoot || 'C:\Windows', 'explorer.exe')

// How long to give the shell to come back before checking on it
const SHELL_RESTART_WAIT_MS = 1500

const PTP_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad'
const EDGEUI_KEY = 'HKCU\\Software\\Policies\\Microsoft\\Windows\\EdgeUI'

// Every one of these uses 0 = "Nothing", which is what disables the gesture.
const PTP_VALUES = [
  'ThreeFingerSlideEnabled', // 3-finger swipe: switch apps / task view / show desktop
  'FourFingerSlideEnabled', // 4-finger swipe: switch virtual desktops
  'ThreeFingerTapEnabled', // 3-finger tap: search
  'FourFingerTapEnabled', // 4-finger tap: action center
]

const diag = require('./diag-log')
const log = (message, data) => diag.write('TouchpadGestures', message, data)
const warn = (message, data) => diag.write('TouchpadGestures', `WARN ${message}`, data)

const BACKUP_FILENAME = 'touchpad-gestures-backup.json'

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
 * Read a REG_DWORD. Returns the number, or null when the value does not exist.
 */
function readDword(key, name) {
  try {
    const output = execFileSync(REG_EXE, ['query', key, '/v', name], {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString()

    const match = output.match(/REG_DWORD\s+0x([0-9a-fA-F]+)/)
    return match ? parseInt(match[1], 16) : null
  } catch (error) {
    // Missing key or value - reg exits non-zero
    return null
  }
}

function writeDword(key, name, value) {
  execFileSync(REG_EXE, ['add', key, '/v', name, '/t', 'REG_DWORD', '/d', String(value), '/f'], {
    stdio: 'ignore',
  })
}

function deleteValue(key, name) {
  try {
    execFileSync(REG_EXE, ['delete', key, '/v', name, '/f'], { stdio: 'ignore' })
  } catch (error) {
    // Already absent
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

function clearBackupFile() {
  const file = backupFilePath()
  if (!file) return

  try {
    if (fs.existsSync(file)) fs.unlinkSync(file)
  } catch (error) {
    warn('Failed to clear backup file:', error.message)
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

/**
 * Restore settings left behind by a previous run that crashed before cleanup.
 * Safe to call on every startup - it is a no-op when no stale backup exists.
 */
function restoreStaleBackup() {
  if (process.platform !== 'win32') return false

  const stale = readBackupFile()
  if (!stale) return false

  log('Found backup from a previous session, restoring first')
  backup = stale
  return restore()
}

function sleepSync(ms) {
  // No async available here - disable() runs inline during startup
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function isShellRunning() {
  try {
    const output = execFileSync(TASKLIST_EXE, ['/FI', 'IMAGENAME eq explorer.exe', '/NH'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString()
    return /explorer\.exe/i.test(output)
  } catch (error) {
    return false
  }
}

/**
 * Restart explorer.exe so the shell picks up the gesture settings we just wrote.
 * Without this the change only applies at the next sign-in.
 */
function restartShell(reason) {
  if (process.platform !== 'win32') return false

  if (process.env.DISABLE_SHELL_RESTART) {
    log('Shell restart skipped (DISABLE_SHELL_RESTART=true) - change applies at next sign-in')
    return false
  }

  log(`Restarting explorer.exe so the gesture change takes effect (${reason})`)

  try {
    execFileSync(TASKKILL_EXE, ['/f', '/im', 'explorer.exe'], { stdio: 'ignore' })
  } catch (error) {
    // taskkill exits non-zero when the shell was not running
  }

  sleepSync(SHELL_RESTART_WAIT_MS)

  // Windows usually auto-restarts the shell, but not on every configuration.
  // Never launch it blindly - explorer.exe with a shell already up opens a
  // File Explorer window in the student's face.
  if (isShellRunning()) {
    log('Shell restarted')
    return true
  }

  try {
    const { spawn } = require('child_process')
    spawn(EXPLORER_EXE, [], { detached: true, stdio: 'ignore' }).unref()
    sleepSync(SHELL_RESTART_WAIT_MS)
    log('Shell restarted manually', { running: isShellRunning() })
    return true
  } catch (error) {
    warn('Failed to restart the shell:', error.message)
    return false
  }
}

/**
 * Turn off 3/4 finger touchpad gestures and touchscreen edge swipe.
 */
function disable() {
  if (process.platform !== 'win32') {
    log('Not on Windows, skipping')
    return false
  }

  if (backup) {
    log('Already disabled')
    return true
  }

  log('Disabling 3/4 finger touchpad gestures...')

  const snapshot = { ptp: {}, edgeSwipe: readDword(EDGEUI_KEY, 'AllowEdgeSwipe') }
  let disabledCount = 0

  PTP_VALUES.forEach((name) => {
    snapshot.ptp[name] = readDword(PTP_KEY, name)

    try {
      writeDword(PTP_KEY, name, 0)
      disabledCount++
    } catch (error) {
      warn(`Failed to disable ${name}:`, error.message)
    }
  })

  // Touchscreen edge swipe opens task view the same way a 3-finger swipe does.
  // HKCU\Software\Policies is admin-write-only, so this one silently needs an
  // elevated kiosk - the touchpad values above do not.
  try {
    writeDword(EDGEUI_KEY, 'AllowEdgeSwipe', 0)
  } catch (error) {
    log('Edge swipe policy not set (needs admin) - touchpad gestures unaffected')
  }

  // Only bounce the shell when something actually changed - a restart the student
  // can see is not worth paying for on every launch
  snapshot.changed = PTP_VALUES.some((name) => snapshot.ptp[name] !== 0)

  backup = snapshot
  saveBackupFile(snapshot)

  log(`Disabled ${disabledCount}/${PTP_VALUES.length} gesture settings`)
  log('State now:', readCurrentState())

  if (snapshot.changed) {
    restartShell('gestures disabled')
  } else {
    log('Gestures were already off, shell restart not needed')
  }

  return disabledCount > 0
}

/**
 * Put the student's own gesture settings back.
 */
function restore() {
  if (process.platform !== 'win32') return false

  if (!backup) {
    log('Nothing to restore')
    return true
  }

  log('Restoring touchpad gesture settings...')

  Object.entries(backup.ptp || {}).forEach(([name, value]) => {
    try {
      if (value === null || value === undefined) {
        // The value did not exist before we touched it
        deleteValue(PTP_KEY, name)
      } else {
        writeDword(PTP_KEY, name, value)
      }
    } catch (error) {
      warn(`Failed to restore ${name}:`, error.message)
    }
  })

  try {
    if (backup.edgeSwipe === null || backup.edgeSwipe === undefined) {
      deleteValue(EDGEUI_KEY, 'AllowEdgeSwipe')
    } else {
      writeDword(EDGEUI_KEY, 'AllowEdgeSwipe', backup.edgeSwipe)
    }
  } catch (error) {
    warn('Failed to restore edge swipe:', error.message)
  }

  const needsShellRestart = backup.changed !== false

  backup = null
  clearBackupFile()

  if (needsShellRestart) restartShell('gestures restored')

  log('Touchpad gesture settings restored')
  return true
}

function isDisabled() {
  return backup !== null
}

/**
 * Current on-disk state of every gesture value, for the startup log. An absent
 * value means the gesture is at its Windows default (enabled).
 */
function readCurrentState() {
  if (process.platform !== 'win32') return {}

  const state = {}
  PTP_VALUES.forEach((name) => {
    const value = readDword(PTP_KEY, name)
    state[name] = value === null ? 'default (enabled)' : value
  })
  return state
}

module.exports = {
  disable,
  restore,
  restoreStaleBackup,
  isDisabled,
  readCurrentState,
}
