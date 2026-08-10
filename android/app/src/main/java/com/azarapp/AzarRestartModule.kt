package com.azarapp

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * react-native-restart's `Restart()` only calls
 * `ReactInstanceManager.recreateReactContextInBackground()` on Android
 * (verified in node_modules/react-native-restart — the ProcessPhoenix
 * import there is dead code, never called). That reloads the JS bundle
 * inside the *same* Activity/ReactRootView, so a layout-direction change
 * from `I18nManager.forceRTL()` — applied by Android when a ReactRootView
 * is created, not when JS reloads — never actually takes effect. Only a
 * real `Activity.recreate()` creates a fresh ReactRootView that reads the
 * now-persisted RTL flag, which is what this module does instead.
 */
class AzarRestartModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "AzarRestart"

  @ReactMethod
  fun recreateActivity() {
    val activity = reactApplicationContext.currentActivity ?: return
    activity.runOnUiThread { activity.recreate() }
  }
}
