/* eslint-env jest */
// The package's own jest/mock.js re-exports its replacement as a `default`
// property (an ESM-interop artifact), which leaves named imports like
// `SafeAreaInsetsContext` undefined when Jest replaces the module wholesale
// with it — that breaks @react-navigation/elements's SafeAreaProviderCompat,
// which imports SafeAreaInsetsContext by name. Flattening `.default` onto
// the mock's own top level fixes it without patching the library itself.
jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock')
  return { ...mock, ...mock.default }
})

// react-native-screens' native Screen primitives don't exist under Jest's
// JS-only environment; fall back to plain Views for the test run.
require('react-native-screens').enableScreens(false)
