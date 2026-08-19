const { VARIANT_CONFIG } = require('./browser/config/variant')

module.exports = {
  packagerConfig: {
    name: VARIANT_CONFIG.productName,
    asar: true,
    extraResource: ['browser/ui', 'native/keyhook-helper.exe'],
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
