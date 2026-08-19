// The elevation gate runs before the Browser is even required: when it decides
// to relaunch through UAC this process exits, and nothing else should have
// started by then. See browser/utils/elevation.js for why the kiosk needs it.
const { ensureElevated } = require('./browser/utils/elevation')

ensureElevated()

const Browser = require('./browser/main')
new Browser()
