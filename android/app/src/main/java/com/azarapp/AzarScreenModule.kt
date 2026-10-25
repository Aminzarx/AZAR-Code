package com.azarapp

import android.view.WindowManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Amin #5162: screenshots and screen recordings are allowed only in the Settings section. MainActivity starts with
 * FLAG_SECURE on (Amin #4946); the app clears it while a Settings page is on screen and sets it again on leaving.
 */
class AzarScreenModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "AzarScreen"

  @ReactMethod
  fun setScreenshotsAllowed(allowed: Boolean) {
    val activity = reactApplicationContext.currentActivity ?: return
    activity.runOnUiThread {
      if (allowed) {
        activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
      } else {
        activity.window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
      }
    }
  }
}
