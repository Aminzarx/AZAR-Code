/**
 * Jest-only stand-in for react-native-camera-kit (mapped in jest.config.js).
 * No real camera hardware exists under Jest — this renders a plain View in
 * place of the native `Camera` component so screens/components that mount
 * it (QrCodeScanner) are exercisable in tests without ever producing a
 * real scan event; anything that depends on an actual `onReadCode` firing
 * is out of scope for these tests.
 */
const React = require('react')
const { View } = require('react-native')

function Camera(props) {
  return React.createElement(View, { testID: 'camera-kit-mock', ...props })
}

module.exports = {
  Camera,
  CameraType: { Front: 'front', Back: 'back' },
  Orientation: {}
}
