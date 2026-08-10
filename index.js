/**
 * @format
 */

import { AppRegistry, I18nManager, NativeModules } from 'react-native'
import { App } from './src/app/App'
import { name as appName } from './app.json'

// AZAR is Persian/RTL-first (design-system.md §3), but React Native's
// layout engine (flex direction, ScrollView/FlatList scroll direction,
// gesture directions, native header chrome) follows I18nManager, not the
// app's own theme flag — ThemeProvider's `isRTL` only flips text alignment.
// Without this, the app renders LTR-mirrored on any device whose OS
// locale isn't RTL.
//
// The real bug: forceRTL() only *persists* the setting for the native
// layout engine — Android applies it when a ReactRootView is created, not
// mid-session. On the very first launch after a fresh install or app
// update (both start a brand-new process), that first ReactRootView is
// already created before this code runs, so it still renders
// LTR-mirrored until something creates a *new* ReactRootView.
//
// A previous attempt used the `react-native-restart` package, which
// turned out not to fix this: on Android its `Restart()` only calls
// `ReactInstanceManager.recreateReactContextInBackground()`, which
// reloads the JS bundle inside the *same* Activity/ReactRootView — the
// layout direction never gets re-read. `AzarRestart.recreateActivity()`
// (android/app/src/main/java/com/azarapp/AzarRestartModule.kt) calls the
// real `Activity.recreate()`, which creates a fresh ReactRootView that
// picks up the now-persisted RTL flag.
AppRegistry.registerComponent(appName, () => App)

if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true)
  I18nManager.forceRTL(true)
  NativeModules.AzarRestart?.recreateActivity()
}
