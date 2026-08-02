const CopyWebpackPlugin = require('copy-webpack-plugin')
const webpack = require('webpack')
const path = require('path')
const { APP_VARIANT } = require('./browser/config/variant')

module.exports = {
  entry: './index.js',
  module: {
    rules: [],
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
  externals: {
    // Exclude native modules from webpack bundling
    '../build/Release/keyhook.node': 'commonjs ../build/Release/keyhook.node',
    '../native/build/Release/keyhook.node': 'commonjs ../native/build/Release/keyhook.node',
  },
  plugins: [
    // Bake the build variant (peserta / penguji) into the main bundle so the
    // packaged app can't be pointed at the other portal via an env var.
    new webpack.DefinePlugin({
      'process.env.APP_VARIANT': JSON.stringify(APP_VARIANT),
    }),
    new CopyWebpackPlugin({
      patterns: [
        require.resolve('electron-chrome-extensions/preload'),
        require.resolve('electron-chrome-web-store/preload'),
        // Copy native addon to webpack output
        {
          from: path.resolve(__dirname, 'build/Release/keyhook.node'),
          to: 'build/Release/keyhook.node',
          noErrorOnMissing: true,
        },
        {
          from: path.resolve(__dirname, 'native/build/Release/keyhook.node'),
          to: 'native/build/Release/keyhook.node',
          noErrorOnMissing: true,
        },
      ],
    }),
  ],
}
