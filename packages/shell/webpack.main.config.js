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
    '../native/build/Release/keyhook.node': 'commonjs ../native/build/Release/keyhook.node',
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        require.resolve('electron-chrome-extensions/preload'),
        require.resolve('electron-chrome-web-store/preload'),
        // Copy native addon to webpack output
        {
          from: path.resolve(__dirname, 'native/build/Release/keyhook.node'),
          to: 'native/build/Release/keyhook.node',
          noErrorOnMissing: true,
        },
      ],
    }),
  ],
}
