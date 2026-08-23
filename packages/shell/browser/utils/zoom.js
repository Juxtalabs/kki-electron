// Ctrl / Cmd page zoom.
//
// Electron's built-in zoomIn menu role registers the accelerator
// 'CommandOrControl+Plus', and that only matches a literal '+' - which on most
// layouts needs Shift. The key people actually press for zoom in is Ctrl+= (no
// shift, same physical key), and on a numeric keypad it arrives as NumpadAdd.
// Neither spelling matches the accelerator, so zoom in silently does nothing
// while zoom out works, because '-' needs no shift and matches on the nose.
//
// Rather than guess at every layout's spelling of '+' and list them all as
// accelerators, the keys are handled straight off before-input-event, where the
// produced character and the physical key code are both available. The menu
// items keep their accelerator text for display but no longer register it, so a
// keystroke is still only ever acted on once.

const ZOOM_STEP = 0.5

// Chromium's own range: zoomFactor is 1.2 ** zoomLevel, so this is 25% to 500%.
// Chromium clamps too, but doing it here keeps getZoomLevel() from drifting past
// the end of the range while the display stays put.
const MIN_ZOOM_LEVEL = -7.6
const MAX_ZOOM_LEVEL = 8.8

function usable(webContents) {
  return Boolean(webContents) && !webContents.isDestroyed()
}

function zoomBy(webContents, delta) {
  if (!usable(webContents)) return

  const level = webContents.getZoomLevel() + delta
  webContents.setZoomLevel(Math.min(Math.max(level, MIN_ZOOM_LEVEL), MAX_ZOOM_LEVEL))
}

function zoomIn(webContents) {
  zoomBy(webContents, ZOOM_STEP)
}

function zoomOut(webContents) {
  zoomBy(webContents, -ZOOM_STEP)
}

function resetZoom(webContents) {
  if (usable(webContents)) webContents.setZoomLevel(0)
}

/**
 * Work out which zoom action a key event asks for, or null if it is not one.
 */
function zoomActionFor(input) {
  if (input.type !== 'keyDown') return null

  // Alt+Ctrl+= is not a zoom shortcut anywhere, and swallowing it would eat
  // AltGr combinations on layouts where AltGr reports as Ctrl+Alt.
  if (input.alt) return null

  const modifier = process.platform === 'darwin' ? input.meta : input.control
  if (!modifier) return null

  const { key, code } = input

  // '+' on the main row is Shift+'=', and both characters mean zoom in here.
  if (key === '+' || key === '=' || code === 'NumpadAdd') return 'in'
  if (key === '-' || key === '_' || code === 'NumpadSubtract') return 'out'
  if (key === '0' || code === 'Numpad0') return 'reset'

  return null
}

/**
 * Apply the zoom shortcut in a before-input-event handler.
 *
 * Returns true when the key was a zoom shortcut and has been dealt with, in
 * which case the event is already prevented - so the page never sees the
 * keystroke and the menu accelerator cannot fire on it a second time.
 */
function handleZoomInput(webContents, event, input) {
  const action = zoomActionFor(input)
  if (!action) return false

  event.preventDefault()

  if (action === 'in') zoomIn(webContents)
  else if (action === 'out') zoomOut(webContents)
  else resetZoom(webContents)

  return true
}

module.exports = {
  zoomIn,
  zoomOut,
  resetZoom,
  handleZoomInput,
  // exported for testing
  zoomActionFor,
  ZOOM_STEP,
}
