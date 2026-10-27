package com.azarapp

import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Navid 2026-10-27 «ورود آگهی از دیوار»: EYVAN is in Android's share sheet for text. MainActivity keeps the shared
 * text (a Divar link) here; the app takes it once when it is in front and opens a new file from it.
 */
class AzarShareModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "AzarShare"

  @ReactMethod
  fun takeShared(promise: Promise) {
    val text = pending
    pending = null
    promise.resolve(text)
  }

  companion object {
    @Volatile var pending: String? = null

    fun keep(intent: Intent?) {
      if (intent?.action != Intent.ACTION_SEND || intent.type?.startsWith("text/") != true) return
      val text = intent.getStringExtra(Intent.EXTRA_TEXT)?.take(2000)
      if (!text.isNullOrBlank()) pending = text
    }
  }
}
