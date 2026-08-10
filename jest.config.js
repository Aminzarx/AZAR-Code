module.exports = {
  preset: '@react-native/jest-preset',
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-.*|@op-engineering)/)'
  ],
  // Native modules with no native binary under Jest — see
  // docs/implementation/phase-6-notes.md (op-sqlite) and
  // docs/implementation/phase-7-notes.md (quick-crypto, keychain) for why
  // each mapping exists.
  moduleNameMapper: {
    '^@op-engineering/op-sqlite$':
      '<rootDir>/node_modules/@op-engineering/op-sqlite/node/dist/index.js',
    '^react-native-quick-crypto$': '<rootDir>/testutils/reactNativeQuickCryptoNodeShim.js',
    '^react-native-keychain$': '<rootDir>/testutils/reactNativeKeychainNodeShim.js',
    '^react-native-camera-kit$': '<rootDir>/testutils/reactNativeCameraKitShim.js',
    '^react-native-fs$': '<rootDir>/testutils/reactNativeFsShim.js'
  },
  setupFiles: ['react-native-gesture-handler/jestSetup'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  globalTeardown: '<rootDir>/testutils/globalTeardown.js'
}
