const { VARIANT_CONFIG } = require('./browser/config/variant')

module.exports = {
  packagerConfig: {
    name: VARIANT_CONFIG.productName,
    asar: true,
    extraResource: ['browser/ui', 'native/keyhook-helper.exe'],
    icon: '../../assets/kki-icon',
    appBundleId: 'io.kki.app',
    appCategoryType: 'public.app-category.education',
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
