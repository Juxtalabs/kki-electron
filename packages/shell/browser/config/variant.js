/**
 * Build Variant Configuration
 *
 * The shell is shipped as two separate builds: one for exam takers (peserta)
 * and one for proctors (penguji). The variant is picked at build time via the
 * APP_VARIANT env var (see the package:* / make:* scripts in package.json) and
 * baked into the main bundle by webpack's DefinePlugin, so it can't be changed
 * by the end user after packaging.
 *
 * This file is required both by the bundled app code and by forge.config.js at
 * build time, so it must stay plain CommonJS with no Electron imports.
 */

const VARIANTS = {
  peserta: {
    productName: 'KKI Browser',
    // Base name for electron-builder artifacts (dmg / zip / nsis)
    artifactBaseName: 'KKI-Browser',
    newtabUrl: 'https://portal-ujian-ukom.kki.go.id/login-ujian',
    exitCodeUrl: 'https://api-siukomednakes.kki.go.id/api/super-admin/exit-code/peserta',
  },
  penguji: {
    productName: 'KKI Browser Penguji',
    artifactBaseName: 'KKI-Browser-Penguji',
    newtabUrl: 'https://kolegium-dokter.kki.go.id/penguji',
    exitCodeUrl: 'https://api-siukomednakes.kki.go.id/api/super-admin/exit-code/penguji',
  },
}

const DEFAULT_VARIANT = 'peserta'

const requested = process.env.APP_VARIANT
const APP_VARIANT = Object.prototype.hasOwnProperty.call(VARIANTS, requested)
  ? requested
  : DEFAULT_VARIANT

if (requested && requested !== APP_VARIANT) {
  console.warn(
    `variant: unknown APP_VARIANT "${requested}", falling back to "${DEFAULT_VARIANT}". ` +
      `Valid values: ${Object.keys(VARIANTS).join(', ')}`
  )
}

const VARIANT_CONFIG = VARIANTS[APP_VARIANT]

module.exports = { APP_VARIANT, VARIANT_CONFIG, VARIANTS, DEFAULT_VARIANT }
