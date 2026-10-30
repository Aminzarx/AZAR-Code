package com.azarapp

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.concurrent.TimeUnit

/**
 * Amin #6214 (brain: no outside push service): KSS announcements marked «روی گوشی هم» reach the phone's notification
 * shade. Android runs this about every 15 minutes while there is internet (some brands delay or stop background work).
 * One small public request: GET /announcements/push?since=<the newest announcement already known here>. The app moves
 * «since» forward whenever it shows the announcements itself, so nothing already seen in the app pops up again. A fresh
 * install starts from «now» and never shows old ones. With notifications switched off nothing is shown (the in-app bell
 * still counts them).
 */
class AzarAnnouncementWorker(context: Context, params: WorkerParameters) : Worker(context, params) {

  override fun doWork(): Result {
    val prefs = applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val since = prefs.getString(KEY_SINCE, null)
    val query = if (since != null) "?since=" + URLEncoder.encode(since, "UTF-8") else ""
    var conn: HttpURLConnection? = null
    try {
      conn = URL("$API/announcements/push$query").openConnection() as HttpURLConnection
      conn.connectTimeout = 10_000
      conn.readTimeout = 10_000
      if (conn.responseCode != 200) return Result.success()
      val json = JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
      val list = json.optJSONArray("announcements")
      if (since != null && list != null) {
        for (i in 0 until list.length()) show(applicationContext, list.getJSONObject(i))
      }
      moveSince(applicationContext, json.optString("latest", ""))
    } catch (_: Exception) {
      // no internet or a bad answer: the next run tries again
    } finally {
      conn?.disconnect()
    }
    return Result.success()
  }

  companion object {
    private const val API = "https://api.zarandix.ir"
    const val PREFS = "eyvan_announcements"
    private const val KEY_SINCE = "since"
    private const val CHANNEL = "announcements"
    private const val PERIODIC = "eyvan-announcements"

    /** «since» only ever moves forward (ISO times from the server compare as text) */
    fun moveSince(context: Context, latest: String) {
      if (latest.isEmpty()) return
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      val since = prefs.getString(KEY_SINCE, null)
      if (since == null || latest > since) prefs.edit().putString(KEY_SINCE, latest).apply()
    }

    private fun online() = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

    /** the 15-minute check; kept as it is when already scheduled */
    fun schedule(context: Context) {
      val work = PeriodicWorkRequestBuilder<AzarAnnouncementWorker>(15, TimeUnit.MINUTES).setConstraints(online()).build()
      WorkManager.getInstance(context).enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.KEEP, work)
    }

    private fun show(context: Context, a: JSONObject) {
      val manager = NotificationManagerCompat.from(context)
      if (!manager.areNotificationsEnabled()) return
      val system = context.getSystemService(NotificationManager::class.java)
      if (system.getNotificationChannel(CHANNEL) == null) {
        system.createNotificationChannel(
          NotificationChannel(CHANNEL, "اعلان‌های ایوان", NotificationManager.IMPORTANCE_DEFAULT).apply {
            description = "خبرها و پیام‌های تیم ایوان"
          }
        )
      }
      val id = a.optString("id")
      val open = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      }
      val tap = open?.let {
        PendingIntent.getActivity(context, id.hashCode(), it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
      }
      val text = a.optString("text")
      val notification = NotificationCompat.Builder(context, CHANNEL)
        .setSmallIcon(R.drawable.ic_stat_announcement)
        .setContentTitle(a.optString("title"))
        .setContentText(text)
        .setStyle(NotificationCompat.BigTextStyle().bigText(text))
        .setAutoCancel(true)
        .setContentIntent(tap)
        .build()
      try {
        manager.notify(id.hashCode(), notification)
      } catch (_: SecurityException) {
        // the permission was withdrawn between the check and here
      }
    }
  }
}
