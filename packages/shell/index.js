// The elevation gate runs before the Browser is even required: it only returns
// when we are administrator, and otherwise exits - either handing over to the
// copy Windows elevated for us, or closing because the UAC prompt was refused.
// Nothing else should have started by then. See browser/utils/elevation.js.
const { ensureElevated } = require('./browser/utils/elevation')

ensureElevated()

const Browser = require('./browser/main')
new Browser()
