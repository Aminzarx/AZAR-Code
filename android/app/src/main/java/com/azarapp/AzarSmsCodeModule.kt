package com.azarapp

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.auth.api.phone.SmsRetriever
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Status

/**
 * v1.2.0 (Amin #4229/#4232): fills the sign-in code from the SMS, two ways
 * at once, both from Google Play services and neither needing an SMS
 * permission:
 *  - SMS Retriever: an SMS that ends with AZAR's 11-character app tag
 *    (computed from the package name + release signing key; for the
 *    2026-10-23 key it is 9kE13uqFQoX) is handed over directly, with no
 *    question, like Telegram.
 *  - SMS User Consent: any other SMS with a code makes Android ask once
 *    «allow AZAR to read this message?».
 * When the tagged SMS arrives both fire; the consent question waits a
 * moment and is dropped once the direct copy came. The message text goes
 * to JS as the "AzarSmsCode" event, where the code is taken out.
 */
class AzarSmsCodeModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var receiver: BroadcastReceiver? = null
  private var deliveredDirectly = false
  private val main = Handler(Looper.getMainLooper())

  private val activityListener =
    object : BaseActivityEventListener() {
      override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?
      ) {
        if (requestCode != CONSENT_REQUEST || resultCode != Activity.RESULT_OK) return
        val message = data?.getStringExtra(SmsRetriever.EXTRA_SMS_MESSAGE) ?: return
        emit(message)
      }
    }

  init {
    reactContext.addActivityEventListener(activityListener)
  }

  override fun getName() = "AzarSmsCode"

  /** Starts listening for the next code SMS; resolves false where Play services are missing. */
  @ReactMethod
  fun start(promise: Promise) {
    stopReceiver()
    deliveredDirectly = false
    try {
      val client = SmsRetriever.getClient(reactApplicationContext)
      client.startSmsRetriever()
      client
        .startSmsUserConsent(null)
        .addOnSuccessListener {
          registerReceiver()
          promise.resolve(true)
        }
        .addOnFailureListener { promise.resolve(false) }
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun stop() {
    stopReceiver()
  }

  // Required by NativeEventEmitter on the JS side.
  @ReactMethod fun addListener(eventName: String) {}

  @ReactMethod fun removeListeners(count: Double) {}

  override fun invalidate() {
    stopReceiver()
    reactApplicationContext.removeActivityEventListener(activityListener)
    super.invalidate()
  }

  private fun registerReceiver() {
    val r =
      object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
          if (intent.action != SmsRetriever.SMS_RETRIEVED_ACTION) return
          val extras = intent.extras ?: return
          @Suppress("DEPRECATION") val status = extras.get(SmsRetriever.EXTRA_STATUS) as? Status
          if (status?.statusCode != CommonStatusCodes.SUCCESS) {
            stopReceiver()
            return
          }
          val direct = extras.getString(SmsRetriever.EXTRA_SMS_MESSAGE)
          if (direct != null) {
            deliveredDirectly = true
            emit(direct)
            stopReceiver()
            return
          }
          @Suppress("DEPRECATION")
          val consent = extras.getParcelable<Intent>(SmsRetriever.EXTRA_CONSENT_INTENT) ?: return
          main.postDelayed({ askConsent(consent) }, CONSENT_DELAY_MS)
        }
      }
    ContextCompat.registerReceiver(
      reactApplicationContext,
      r,
      IntentFilter(SmsRetriever.SMS_RETRIEVED_ACTION),
      SmsRetriever.SEND_PERMISSION,
      null,
      ContextCompat.RECEIVER_EXPORTED
    )
    receiver = r
  }

  private fun askConsent(consent: Intent) {
    if (deliveredDirectly) return
    stopReceiver()
    val activity = reactApplicationContext.currentActivity ?: return
    try {
      activity.startActivityForResult(consent, CONSENT_REQUEST)
    } catch (e: Exception) {
      // the code can still be typed by hand
    }
  }

  private fun emit(message: String) {
    reactApplicationContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(EVENT, message)
  }

  private fun stopReceiver() {
    val r = receiver ?: return
    receiver = null
    try {
      reactApplicationContext.unregisterReceiver(r)
    } catch (e: IllegalArgumentException) {
      // already gone
    }
  }

  companion object {
    private const val CONSENT_REQUEST = 4229
    private const val CONSENT_DELAY_MS = 1500L
    const val EVENT = "AzarSmsCode"
  }
}
