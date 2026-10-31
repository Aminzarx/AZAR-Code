package com.azarapp

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

/**
 * v1.2.0 (Amin #4223): installs a downloaded update from inside the app,
 * without a browser. The JS side downloads the APK into filesDir/updates
 * and checks its sha256; this module only hands that file to Android's
 * own installer, which shows its short confirmation over the app. Android
 * requires that confirmation (and, the first time, the "install from this
 * source" permission) for any app outside Google Play — it cannot be
 * skipped. Data stays because the update is signed with the same key.
 */
class AzarInstallerModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "AzarInstaller"

  @ReactMethod
  fun canInstall(promise: Promise) {
    promise.resolve(reactApplicationContext.packageManager.canRequestPackageInstalls())
  }

  @ReactMethod
  fun openInstallPermission(promise: Promise) {
    val ctx = reactApplicationContext
    val intent =
      Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${ctx.packageName}"))
    try {
      start(intent)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("E_SETTINGS", e)
    }
  }

  @ReactMethod
  fun install(path: String, promise: Promise) {
    val ctx = reactApplicationContext
    val file = File(path).canonicalFile
    // Only a file the app itself downloaded into its private updates folder.
    val updatesDir = File(ctx.filesDir, "updates").canonicalFile
    if (!file.isFile || file.parentFile != updatesDir || !file.name.endsWith(".apk")) {
      promise.reject("E_FILE", "update file missing")
      return
    }
    try {
      val uri = FileProvider.getUriForFile(ctx, "${ctx.packageName}.updates", file)
      val intent =
        Intent(Intent.ACTION_VIEW)
          .setDataAndType(uri, "application/vnd.android.package-archive")
          .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      start(intent)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("E_INSTALL", e)
    }
  }

  private fun start(intent: Intent) {
    val activity = reactApplicationContext.currentActivity
    if (activity != null) {
      activity.startActivity(intent)
    } else {
      reactApplicationContext.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
  }
}
