// Turn off the system shortcuts that let a candidate leave the exam: Task
// Manager (Ctrl+Alt+Del), Lock Workstation (Win+L), the Game Bar (Win+G) and
// PrintScreen -> Snipping Tool. All of them live in the per-user registry.
//
// The hard part is not disabling them, it is guaranteeing they come back. The
// kiosk prevents its own windows from closing, so a Windows shutdown, a crash or
// a force-kill can end the process without cleanup ever running - and the
// student is then left with Task Manager permanently disabled. Two things guard
// against that, both borrowed from utils/touchpad-gestures.js:
//
//   - every original value is read before it is overwritten and mirrored to a
//     file in userData, so restore puts the student's own setting back rather
//     than a guessed Windows default (the old code always wrote Game Bar back as
//     enabled, whether or not it started that way);
//   - restoreStaleBackup() runs at startup and undoes whatever a previous run
//     left behind, so a machine that was killed mid-exam heals on the next
//     launch instead of staying locked down forever.
//
// reg.exe is called by absolute path and without a shell, so a reg.exe planted
// earlier in PATH cannot be used instead and the spaces in "Control Panel" need
// no quoting.

const { execFileSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const diag = require('./diag-log')
const log = (message, data) => diag.write('SystemShortcuts', message, data)
const warn = (message, data) => diag.write('SystemShortcuts', `WARN ${message}`, data)

const REG_EXE = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'reg.exe')

const BACKUP_FILENAME = 'system-shortcuts-backup.json'

const POLICIES_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System'
const GAMEDVR_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR'
const GAMECONFIG_KEY = 'HKCU\\System\\GameConfigStore'
const KEYBOARD_KEY = 'HKCU\\Control Panel\\Keyboard'

// Every value the kiosk touches, grouped so a single group can still be driven
// on its own through the per-feature functions below. `disabled` is what we
// write; the original is whatever was there first, including "not present".
const GROUPS = {
  taskManager: [{ key: POLICIES_KEY, name: 'DisableTaskMgr', disabled: 1 }],
  lockWorkstation: [{ key: POLICIES_KEY, name: 'DisableLockWorkstation', disabled: 1 }],
  gameBar: [
    { key: GAMEDVR_KEY, name: 'AppCaptureEnabled', disabled: 0 },
    { key: GAMECONFIG_KEY, name: 'GameDVR_Enabled', disabled: 0 },
  ],
  // The low-level hook already swallows VK_SNAPSHOT; this closes the same door
  // one layer lower so a hook that fails to install does not leave a one-key
  // capture available.
  snippingHotkey: [{ key: KEYBOARD_KEY, name: 'PrintScreenKeyForSnippingEnabled', disabled: 0 }],
}

/** Original values, keyed by "<key>\<name>". null means the value did not exist. */
let backup = null

function valueId(entry) {
  return `${entry.key}\\${entry.name}`
}

function knownValueIds() {
  return new Set(
    Object.values(GROUPS).flatMap((entries) => entries.map((entry) => valueId(entry)))
  )
}

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

function saveBackupFile() {
  const file = backupFilePath()
  if (!file) return

  try {
    fs.writeFileSync(file, JSON.stringify(backup, null, 2))
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
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch (error) {
    warn('Failed to read backup file:', error.message)
    return null
  }
}

/**
 * Remember the current value of an entry, once. Recording it a second time
 * would capture our own disabled value as the student's original, which is the
 * one mistake here that cannot be undone - hence the guard.
 */
function rememberOriginal(entry) {
  if (!backup) backup = {}

  const id = valueId(entry)
  if (id in backup) return

  backup[id] = readDword(entry.key, entry.name)
}

function restoreEntry(entry) {
  const id = valueId(entry)
  if (!backup || !(id in backup)) return false

  const original = backup[id]

  try {
    if (original === null || original === undefined) {
      // The value did not exist before we touched it, so remove ours rather
      // than inventing one.
      deleteValue(entry.key, entry.name)
    } else {
      writeDword(entry.key, entry.name, original)
    }
  } catch (error) {
    warn(`Failed to restore ${id}:`, error.message)
    return false
  }

  delete backup[id]
  return true
}

/**
 * Disable one group and record what was there first.
 */
function disableGroup(label, entries) {
  if (process.platform !== 'win32') {
    log(`Not on Windows, skipping ${label}`)
    return false
  }

  let changed = 0

  entries.forEach((entry) => {
    rememberOriginal(entry)

    try {
      writeDword(entry.key, entry.name, entry.disabled)
      changed++
    } catch (error) {
      warn(`Failed to disable ${valueId(entry)}:`, error.message)
    }
  })

  saveBackupFile()

  if (changed === entries.length) log(`${label} disabled`)
  return changed > 0
}

/**
 * Put one group back the way the student had it.
 */
function restoreGroup(label, entries) {
  if (process.platform !== 'win32') return false

  const restored = entries.filter((entry) => restoreEntry(entry)).length

  if (restored === 0) {
    // Nothing was recorded for this group - either it was never disabled, or a
    // previous restore already dealt with it.
    return true
  }

  // Reading back is what turns "some machines are still locked down" from a
  // report into a line in the diag log.
  entries.forEach((entry) => {
    const now = readDword(entry.key, entry.name)
    if (now === entry.disabled) {
      warn(`${valueId(entry)} is still at the kiosk value after restore`, { value: now })
    }
  })

  if (backup && Object.keys(backup).length === 0) {
    backup = null
    clearBackupFile()
  } else if (backup) {
    saveBackupFile()
  }

  log(`${label} restored`)
  return true
}

/**
 * Undo settings left behind by a previous run that was killed before cleanup.
 * Safe to call on every startup - a no-op when no stale backup exists.
 */
function restoreStaleBackup() {
  if (process.platform !== 'win32') return false

  const stale = readBackupFile()
  if (!stale || Object.keys(stale).length === 0) {
    // An empty file is still ours to clean up.
    if (stale) clearBackupFile()
    return false
  }

  log('Found system shortcut backup from a previous session, restoring first', stale)
  backup = stale
  return enableAllSystemShortcuts()
}

function disableTaskManager() {
  return disableGroup('Task Manager (Ctrl+Alt+Del)', GROUPS.taskManager)
}

function disableLockWorkstation() {
  return disableGroup('Lock Workstation (Win+L)', GROUPS.lockWorkstation)
}

function disableGameBar() {
  return disableGroup('Game Bar (Win+G)', GROUPS.gameBar)
}

function disableSnippingHotkey() {
  return disableGroup('PrintScreen -> Snipping Tool', GROUPS.snippingHotkey)
}

function enableTaskManager() {
  return restoreGroup('Task Manager (Ctrl+Alt+Del)', GROUPS.taskManager)
}

function enableLockWorkstation() {
  return restoreGroup('Lock Workstation (Win+L)', GROUPS.lockWorkstation)
}

function enableGameBar() {
  return restoreGroup('Game Bar (Win+G)', GROUPS.gameBar)
}

function enableSnippingHotkey() {
  return restoreGroup('PrintScreen -> Snipping Tool', GROUPS.snippingHotkey)
}

/**
 * Disable every system shortcut the kiosk takes over.
 */
function disableAllSystemShortcuts() {
  if (process.platform !== 'win32') {
    log('Not on Windows, skipping')
    return false
  }

  // Defensive: never snapshot on top of a run that never cleaned up, or the
  // disabled values become the "originals" we restore to.
  if (!backup) restoreStaleBackup()

  log('Disabling system shortcuts via Registry...')

  const results = {
    taskManager: disableTaskManager(),
    lockWorkstation: disableLockWorkstation(),
    gameBar: disableGameBar(),
    snippingHotkey: disableSnippingHotkey(),
  }

  const total = Object.keys(results).length
  const successCount = Object.values(results).filter((r) => r === true).length
  log(`Disabled ${successCount}/${total} system shortcuts`)

  return successCount > 0
}

/**
 * Put every system shortcut back. Idempotent: calling it twice, or without a
 * matching disable, does nothing the second time.
 */
function enableAllSystemShortcuts() {
  if (process.platform !== 'win32') {
    log('Not on Windows, skipping')
    return false
  }

  if (!backup) {
    log('Nothing to restore')
    return true
  }

  log('Re-enabling system shortcuts...')

  const results = {
    taskManager: enableTaskManager(),
    lockWorkstation: enableLockWorkstation(),
    gameBar: enableGameBar(),
    snippingHotkey: enableSnippingHotkey(),
  }

  // Anything recorded for a value no group knows about can only come from a
  // backup file that outlived a change to GROUPS. Nothing will ever restore it,
  // so drop it rather than let it be replayed on every future launch.
  Object.keys(backup || {}).forEach((id) => {
    if (!knownValueIds().has(id)) {
      warn('Discarding backup entry that belongs to no group', { [id]: backup[id] })
      delete backup[id]
    }
  })

  if (backup && Object.keys(backup).length > 0) {
    // Something refused to restore - a locked key, a denied write. Keep the
    // record on disk so the next launch tries again instead of leaving the
    // student with a permanently disabled Task Manager.
    warn('Some values could not be restored, backup kept for the next launch', backup)
    saveBackupFile()
  } else {
    backup = null
    clearBackupFile()
  }

  const total = Object.keys(results).length
  const successCount = Object.values(results).filter((r) => r === true).length
  log(`Re-enabled ${successCount}/${total} system shortcuts`)

  return successCount > 0
}

function isDisabled() {
  return backup !== null
}

/**
 * Current on-disk state of every value we manage, for the startup log.
 */
function readCurrentState() {
  if (process.platform !== 'win32') return {}

  const state = {}
  Object.values(GROUPS).forEach((entries) => {
    entries.forEach((entry) => {
      const value = readDword(entry.key, entry.name)
      state[valueId(entry)] = value === null ? 'not set (default)' : value
    })
  })
  return state
}

/**
 * Legacy names - Task Manager only, kept for callers that predate the rest.
 */
function disableAltTab() {
  return disableTaskManager()
}

function enableAltTab() {
  return enableTaskManager()
}

module.exports = {
  disableAllSystemShortcuts,
  enableAllSystemShortcuts,
  restoreStaleBackup,
  isDisabled,
  readCurrentState,
  disableTaskManager,
  enableTaskManager,
  disableLockWorkstation,
  enableLockWorkstation,
  disableGameBar,
  enableGameBar,
  disableSnippingHotkey,
  enableSnippingHotkey,

  // Legacy functions
  disableAltTab,
  enableAltTab,
}
