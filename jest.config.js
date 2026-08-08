module.exports = {
  preset: '@react-native/jest-preset',
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-.*|@op-engineering)/)'
  ],
  // op-sqlite is a native module: under Jest (no real device) there is no
  // native binary to bridge to, so its default "react-native" build can't
  // run. The package ships a real Node.js binding (backed by
  // better-sqlite3) specifically for this — see
  // docs/implementation/phase-6-notes.md — used here so database tests
  // exercise a real SQLite engine, not a mock.
  moduleNameMapper: {
    '^@op-engineering/op-sqlite$':
      '<rootDir>/node_modules/@op-engineering/op-sqlite/node/dist/index.js'
  },
  setupFiles: ['react-native-gesture-handler/jestSetup'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
}
