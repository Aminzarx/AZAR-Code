package com.azarapp

import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/** Amin #6214: the app's side of the announcement notifications (see AzarAnnouncementWorker). */
class AzarPushModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "AzarPush"

  /** the app has shown announcements up to this time: the background check starts after it */
  @ReactMethod
  fun seenUpTo(createdAt: String) {
    AzarAnnouncementWorker.moveSince(reactApplicationContext, createdAt)
  }

  /** false the first time only (and remembers it): the notification permission is asked once, on «اعلان‌ها» */
  @ReactMethod
  fun askedOnce(promise: Promise) {
    val prefs = reactApplicationContext.getSharedPreferences(AzarAnnouncementWorker.PREFS, Context.MODE_PRIVATE)
    val asked = prefs.getBoolean("asked_permission", false)
    if (!asked) prefs.edit().putBoolean("asked_permission", true).apply()
    promise.resolve(asked)
  }
}
