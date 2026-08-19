// Catch-all for window switching that never reaches the app as a keystroke.
//
// A 3-finger swipe, task view, a taskbar click or anything else that hands the
// foreground to another process shows up here as "no window of ours is focused
// anymore". When that happens we log it as a violation and pull the kiosk window
// back to the front.
//
// The check is deliberately app-wide, not per-window: the access-denied popup is a
// separate BrowserWindow, so focus moving between our own windows is normal and
// must not trigger a reclaim.

const { app, BrowserWindow } = require('electron')

// Give the OS a moment to settle before deciding focus really left the app.
const FOCUS_SETTLE_MS = 150
// Backstop for focus changes that arrive without a 'blur' event.
const SWEEP_INTERVAL_MS = 1000
// Don't spam the log when a gesture produces a burst of focus changes.
const VIOLATION_COOLDOWN_MS = 1500
const MAX_VIOLATION_HISTORY = 200

const diag = require('./diag-log')
const log = (message, data) => diag.write('FocusGuard', message, data)
const warn = (message, data) => diag.write('FocusGuard', `WARN ${message}`, data)

const guardedWindows = new Set()
const violations = []

let sweepInterval = null
let suspended = false
let lastViolationAt = 0
let onViolation = null
let isQuitting = () => false

function isAppFocused() {
  return BrowserWindow.getAllWindows().some((win) => !win.isDestroyed() && win.isFocused())
}

function isGuardActive() {
  return !suspended && !isQuitting() && guardedWindows.size > 0
}

function recordViolation(reason) {
  const now = Date.now()
  if (now - lastViolationAt < VIOLATION_COOLDOWN_MS) return false
  lastViolationAt = now

  const violation = { reason, timestamp: new Date(now).toISOString() }
  violations.push(violation)
  if (violations.length > MAX_VIOLATION_HISTORY) violations.shift()

  warn(`Focus left the kiosk (${reason}) - violation #${violations.length}`)

  if (onViolation) {
    try {
      onViolation(violation)
    } catch (error) {
      warn('onViolation handler failed:', error.message)
    }
  }

  return true
}

/**
 * Drag the window back to the foreground. Windows only lets a background process
 * do this reliably by briefly making the window topmost, so pulse it rather than
 * pinning it - the access-denied popup is alwaysOnTop and has to stay visible.
 */
function reclaimFocus(win) {
  if (!win || win.isDestroyed()) return

  try {
    const wasAlwaysOnTop = win.isAlwaysOnTop()

    if (win.isMinimized()) win.restore()
    if (!win.isVisible()) win.show()
    if (!win.isKiosk()) win.setKiosk(true)

    win.setAlwaysOnTop(true, 'screen-saver')
    win.moveTop()
    win.focus()
    app.focus({ steal: true })

    setTimeout(() => {
      if (!win.isDestroyed() && !wasAlwaysOnTop) win.setAlwaysOnTop(false)
    }, 500)
  } catch (error) {
    warn('Failed to reclaim focus:', error.message)
  }
}

function checkFocus(win, reason) {
  if (!isGuardActive()) return
  if (!win || win.isDestroyed()) return
  if (isAppFocused()) return

  recordViolation(reason)
  reclaimFocus(win)
}

function scheduleCheck(win, reason) {
  setTimeout(() => checkFocus(win, reason), FOCUS_SETTLE_MS)
}

function startSweep() {
  if (sweepInterval) return

  sweepInterval = setInterval(() => {
    if (!isGuardActive()) return
    if (isAppFocused()) return

    const win = [...guardedWindows].find((w) => !w.isDestroyed())
    if (win) checkFocus(win, 'sweep')
  }, SWEEP_INTERVAL_MS)
}

function stopSweep() {
  if (sweepInterval) {
    clearInterval(sweepInterval)
    sweepInterval = null
  }
}

/**
 * Start watching a kiosk window.
 *
 * @param {BrowserWindow} win
 * @param {Object} [options]
 * @param {Function} [options.isQuitting] returns true while the app is shutting down
 * @param {Function} [options.onViolation] called with each recorded violation
 */
function guardWindow(win, options = {}) {
  if (!win || win.isDestroyed() || guardedWindows.has(win)) return

  if (options.isQuitting) isQuitting = options.isQuitting
  if (options.onViolation) onViolation = options.onViolation

  guardedWindows.add(win)

  win.on('blur', () => scheduleCheck(win, 'blur'))
  win.on('minimize', () => scheduleCheck(win, 'minimize'))
  win.on('hide', () => scheduleCheck(win, 'hide'))
  win.on('closed', () => {
    guardedWindows.delete(win)
    if (guardedWindows.size === 0) stopSweep()
  })

  startSweep()
  log('Guarding kiosk window against focus loss')
}

/**
 * Pause the guard, e.g. around a native modal dialog that legitimately takes focus.
 */
function suspend() {
  suspended = true
}

function resume() {
  suspended = false
}

function uninstall() {
  stopSweep()
  guardedWindows.clear()
  suspended = false
}

function getViolations() {
  return [...violations]
}

function getViolationCount() {
  return violations.length
}

module.exports = {
  guardWindow,
  suspend,
  resume,
  uninstall,
  getViolations,
  getViolationCount,
}
