const CopyWebpackPlugin = require('copy-webpack-plugin')
const path = require('path')

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
        // Copy Face Recognition UI files
        {
          from: path.resolve(__dirname, 'browser/ui'),
          to: 'browser/ui',
          noErrorOnMissing: false,
        },
        // Copy Face API services
        {
          from: path.resolve(__dirname, 'browser/services'),
          to: 'browser/services',
          noErrorOnMissing: false,
        },
        // Copy Face API handlers
        {
          from: path.resolve(__dirname, 'browser/handlers'),
          to: 'browser/handlers',
          noErrorOnMissing: false,
        },
        // Copy Face API preload scripts
        {
          from: path.resolve(__dirname, 'browser/preload'),
          to: 'browser/preload',
          noErrorOnMissing: false,
        },
        // Copy Face API utils
        {
          from: path.resolve(__dirname, 'browser/utils'),
          to: 'browser/utils',
          noErrorOnMissing: false,
        },
      ],
    }),
  ],
}
