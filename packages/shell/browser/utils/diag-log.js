// Append-only log for the kiosk protection layers.
//
// A packaged build has no console attached, so questions like "did the touchpad
// block actually run?" or "did focus get stolen?" can only be answered after the
// fact from a file. Lives next to keyhook-helper.log in %TEMP%.

const fs = require('fs')
const os = require('os')
const path = require('path')

const LOG_PATH = path.join(os.tmpdir(), 'kki-kiosk-diag.log')

function write(tag, message, data) {
  const suffix = data === undefined ? '' : ` ${safeStringify(data)}`
  const line = `${new Date().toISOString()} [${tag}] ${message}${suffix}`

  console.log(line)

  try {
    fs.appendFileSync(LOG_PATH, `${line}\n`)
  } catch (error) {
    // Logging must never take the kiosk down
  }
}

function safeStringify(value) {
  try {
    return typeof value === 'string' ? value : JSON.stringify(value)
  } catch (error) {
    return String(value)
  }
}

module.exports = { write, LOG_PATH }
