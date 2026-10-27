package com.azarapp

import android.content.Intent
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Amin #4946: no screenshots or screen recordings in the app (since #5162: except Settings, see AzarScreenModule). FLAG_SECURE on the one window covers every
   * screen and the recent-apps preview; React Native's Modal copies the flag onto its dialogs.
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    // TEASER CAPTURE BUILD ONLY (Amin #5735): never published — screenshots allowed
    super.onCreate(null)
    // Amin #5199: no preview of the app in the app switcher, Settings included (where screenshots are allowed)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) setRecentsScreenshotEnabled(false)
    AzarShareModule.keep(intent)
  }

  /** Navid 2026-10-27: a Divar link shared while EYVAN is already open (singleTask) */
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    AzarShareModule.keep(intent)
  }

  /** Amin #5055: «هماهنگ با گوشی» — the bars follow the phone when it switches between day and night */
  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    AzarAppearanceModule.colourBars(this, AzarAppearanceModule.savedMode(this))
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "AzarApp"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
