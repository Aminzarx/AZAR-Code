// react-native-fs constructs a NativeEventEmitter at import time, which
// throws under Jest (no native module present). Nothing under test calls
// through to a real filesystem — BackupService's own tests mock this
// module entirely — so a minimal stub is enough to let anything that
// merely imports the module (e.g. via SettingsScreen -> BackupService)
// load without crashing.
module.exports = {
  CachesDirectoryPath: '/mock/caches',
  DocumentDirectoryPath: '/mock/documents',
  writeFile: () => Promise.resolve(),
  readFile: () => Promise.resolve(''),
  unlink: () => Promise.resolve()
}
