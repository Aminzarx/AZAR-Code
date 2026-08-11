/**
 * Jest-only stand-in for react-native-share (mapped in jest.config.js).
 * Its native module doesn't exist under Jest (no real Android/iOS share
 * sheet); tests that need specific `open`/`shareSingle` behavior mock this
 * module themselves per-test, this is just the default so importing it
 * doesn't crash every other test that merely imports something that
 * imports react-native-share transitively.
 */
function open() {
  return Promise.resolve({ success: true, message: '' })
}
function shareSingle() {
  return Promise.resolve({ success: true, message: '' })
}

module.exports = {
  __esModule: true,
  default: { open, shareSingle }
}
