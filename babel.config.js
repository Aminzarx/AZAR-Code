module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
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
