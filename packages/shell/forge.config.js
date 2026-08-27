const fs = require('fs')
const path = require('path')
const { VARIANT_CONFIG } = require('./browser/config/variant')

// Browser.js looks the helper up as resources/keyhook-helper.exe, and
// extraResource copies by basename, so arch-specific builds live in their own
// folder rather than under a suffixed name. The tracked native/keyhook-helper.exe
// is x64; scripts/package-win.js warns when an ia32 build has to fall back to it.
const keyhookHelper = (() => {
  const arch = process.env.APP_TARGET_ARCH
  const archSpecific = path.join('native', arch || '', 'keyhook-helper.exe')
  if (arch && fs.existsSync(path.join(__dirname, archSpecific))) return archSpecific
  return 'native/keyhook-helper.exe'
})()

module.exports = {
  packagerConfig: {
    name: VARIANT_CONFIG.productName,
    asar: true,
    extraResource: ['browser/ui', keyhookHelper],
    icon: '../../assets/kki-icon',
    appBundleId: 'io.kki.app',
    appCategoryType: 'public.app-category.education',
    // Stamp requestedExecutionLevel=requireAdministrator into the packaged
    // exe's manifest so Windows raises the UAC prompt before the app starts
    // rather than after it (browser/utils/elevation.js is the runtime
    // fallback). Only read by the win32 build; the mac builds ignore it.
    win32metadata: {
      'requested-execution-level': 'requireAdministrator',
    },
    osxSign: {},
    osxNotarize: undefined,
    arch: ['x64', 'arm64'],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32'],
    },
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.main.config.js',
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              name: 'browser',
              preload: {
                js: './preload.ts',
              },
            },
          ],
        },
        devServer: {
          client: {
            overlay: false,
          },
        },
      },
    },
  ].filter(Boolean),
}
