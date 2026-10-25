package com.azarapp

import android.app.Activity
import android.app.UiModeManager
import android.content.Context
import android.content.res.Configuration
import android.content.res.Resources
import android.os.Build
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.view.WindowCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Amin #5055: night mode — «روشن» / «تیره» / «هماهنگ با گوشی» (the default). The choice is kept here, on the phone,
 * and applied before anything draws: by MainApplication on every start, and on Android 12+ also handed to the system
 * (per-app night mode), so the system splash already has the right colours. No flash of the other mode.
 */
class AzarAppearanceModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "AzarAppearance"

  override fun getConstants(): Map<String, Any> = mapOf(
    "mode" to savedMode(reactApplicationContext),
    "palette" to (reactApplicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(PALETTE, "navy") ?: "navy")
  )

  /** Amin #5308: the theme (navy, blue or charcoal) is kept next to the light/dark choice */
  @ReactMethod
  fun setPalette(name: String) {
    val clean = if (name == "blue" || name == "charcoal") name else "navy"
    reactApplicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(PALETTE, clean).apply()
  }

  /** the status and navigation bars in the page colour of the theme on screen */
  @ReactMethod
  fun setBars(colour: String, dark: Boolean) {
    val activity = reactApplicationContext.currentActivity ?: return
    val parsed = try { android.graphics.Color.parseColor(colour) } catch (e: IllegalArgumentException) { return }
    activity.runOnUiThread {
      activity.window.statusBarColor = parsed
      activity.window.navigationBarColor = parsed
      WindowCompat.getInsetsController(activity.window, activity.window.decorView).apply {
        isAppearanceLightStatusBars = !dark
        isAppearanceLightNavigationBars = !dark
      }
    }
  }

  @ReactMethod
  fun setMode(mode: String) {
    val clean = if (mode == "light" || mode == "dark") mode else "system"
    reactApplicationContext
      .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY, clean)
      .apply()
    val activity = reactApplicationContext.currentActivity
    if (activity != null) {
      activity.runOnUiThread {
        apply(reactApplicationContext, clean)
        colourBars(activity, clean)
      }
    } else {
      apply(reactApplicationContext, clean)
    }
  }

  companion object {
    private const val PREFS = "azar_appearance"
    private const val KEY = "mode"
    private const val PALETTE = "palette"
    // = res/values(-night)/colors.xml bar_background
    private const val DAY_BAR = 0xFFF8FAFC.toInt()
    private const val NIGHT_BAR = 0xFF0B1220.toInt()

    fun savedMode(context: Context): String =
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "system") ?: "system"

    fun apply(context: Context, mode: String) {
      AppCompatDelegate.setDefaultNightMode(
        when (mode) {
          "light" -> AppCompatDelegate.MODE_NIGHT_NO
          "dark" -> AppCompatDelegate.MODE_NIGHT_YES
          else -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
        }
      )
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val uiMode = context.getSystemService(UiModeManager::class.java) ?: return
        uiMode.setApplicationNightMode(
          when (mode) {
            "light" -> UiModeManager.MODE_NIGHT_NO
            "dark" -> UiModeManager.MODE_NIGHT_YES
            else -> UiModeManager.MODE_NIGHT_AUTO
          }
        )
      }
    }

    /** the window keeps the bar colours it started with; a choice made in the app recolours them at once */
    fun colourBars(activity: Activity, mode: String) {
      val night = when (mode) {
        "dark" -> true
        "light" -> false
        else ->
          (Resources.getSystem().configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
            Configuration.UI_MODE_NIGHT_YES
      }
      val colour = if (night) NIGHT_BAR else DAY_BAR
      activity.window.statusBarColor = colour
      activity.window.navigationBarColor = colour
      WindowCompat.getInsetsController(activity.window, activity.window.decorView).apply {
        isAppearanceLightStatusBars = !night
        isAppearanceLightNavigationBars = !night
      }
    }
  }
}
