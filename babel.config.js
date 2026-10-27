// Amin #5299 / #5543: one plugin for the phone build and the web build (web/vite.config.ts)
const appFontText = require('./babel-app-font')

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    appFontText,
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        alias: {
          '@app': './src/app',
          '@navigation': './src/navigation',
          '@core': './src/core',
          '@features': './src/features',
          '@shared': './src/shared',
          '@infrastructure': './src/infrastructure'
        }
      }
    ]
  ]
}
