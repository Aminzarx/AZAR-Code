/**
 * @format
 */

import { AppRegistry, I18nManager } from 'react-native'
import { App } from './src/app/App'
import { name as appName } from './app.json'

// AZAR is Persian/RTL-first (design-system.md §3), but React Native's
// layout engine (flex direction, ScrollView/FlatList scroll direction,
// gesture directions, native header chrome) follows I18nManager, not the
// app's own theme flag — ThemeProvider's `isRTL` only flips text alignment.
// Without this, the app renders LTR-mirrored on any device whose OS
// locale isn't RTL. forceRTL only takes effect after the JS bundle
// reloads/app restarts, which is why it's set as early as possible, before
// anything renders.
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true)
  I18nManager.forceRTL(true)
}

AppRegistry.registerComponent(appName, () => App)
