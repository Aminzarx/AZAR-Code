// EYVAN web: react-native-web plus the few names it does not have (the app only calls them on Android).
export * from 'react-native-web'
export const PermissionsAndroid = {
  PERMISSIONS: { CAMERA: 'android.permission.CAMERA', READ_SMS: 'android.permission.READ_SMS', RECEIVE_SMS: 'android.permission.RECEIVE_SMS', POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS' },
  RESULTS: { GRANTED: 'granted', DENIED: 'denied', NEVER_ASK_AGAIN: 'never_ask_again' },
  check: async () => false,
  request: async () => 'denied',
  requestMultiple: async () => ({})
}

/**
 * The app's own copy buttons (invite code, support text) write straight to the clipboard, which needs no «copy»
 * event: guards.ts keeps the user's own copying closed (#5199) and these still work.
 */
export const Clipboard = {
  getString: async () => (navigator.clipboard?.readText ? navigator.clipboard.readText().catch(() => '') : ''),
  setString: (text: string) => {
    void navigator.clipboard?.writeText(text).catch(() => undefined)
  },
  hasString: async () => false
}
