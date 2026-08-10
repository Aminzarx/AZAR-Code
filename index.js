/**
 * @format
 */

import { AppRegistry, I18nManager } from 'react-native'
import RNRestart from 'react-native-restart'
import { App } from './src/app/App'
import { name as appName } from './app.json'

// AZAR is Persian/RTL-first (design-system.md §3), but React Native's
// layout engine (flex direction, ScrollView/FlatList scroll direction,
// gesture directions, native header chrome) follows I18nManager, not the
// app's own theme flag — ThemeProvider's `isRTL` only flips text alignment.
// Without this, the app renders LTR-mirrored on any device whose OS
// locale isn't RTL.
//
// The real bug this fixes (found after RTL issues kept being reported
// despite exhaustive per-screen alignSelf audits): forceRTL() only
// *persists* the setting for the native layout engine — it does not
// retroactively mirror the Activity/root view that Android already
// created before this JS ever ran. On the very first launch after a
// fresh install *or an app update* (both start a brand-new process),
// I18nManager.isRTL reads false, forceRTL(true) sets the flag for next
// time, but that same first session still renders LTR-mirrored rows
// (flexDirection: 'row' order, ScrollView direction, etc.) because the
// native side never re-reads the flag mid-session. Previously this
// required the user to manually force-close and reopen the app once
// before RTL mirroring actually took effect — which reads as "RTL is
// still broken" on every fresh install/update. Fixing it for real means
// not waiting for that: force one immediate, automatic restart the
// moment we flip the flag, so the *next* process (which the user never
// has to trigger themselves) boots directly in the correct RTL state.
AppRegistry.registerComponent(appName, () => App)

if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true)
  I18nManager.forceRTL(true)
  // Registered above first as a safety net in case restart() doesn't
  // fire instantly on some device — better a correctly-registered root
  // component for a stray frame than none at all.
  RNRestart.restart()
}
