package com.azarapp

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
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
 * v1.2.0 (Amin #4229): fills the sign-in code from the SMS. The code SMS
 * comes from a fixed Kavenegar template, so the hash-based SMS Retriever
 * can't be used; Google's SMS User Consent API needs no change to the
 * text: when the next SMS with a code arrives (within 5 minutes), Android
 * asks once «allow AZAR to read this message?» and, on allow, the message
 * text is sent to JS as the "AzarSmsCode" event, where the code is taken
 * out. Nothing is read without that tap; no SMS permission is declared.
 */
class AzarSmsCodeModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var receiver: BroadcastReceiver? = null

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
        reactApplicationContext
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit(EVENT, message)
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
    try {
      SmsRetriever.getClient(reactApplicationContext)
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
          if (status?.statusCode == CommonStatusCodes.SUCCESS) {
            @Suppress("DEPRECATION")
            val consent = extras.getParcelable<Intent>(SmsRetriever.EXTRA_CONSENT_INTENT)
            val activity = reactApplicationContext.currentActivity
            if (consent != null && activity != null) {
              try {
                activity.startActivityForResult(consent, CONSENT_REQUEST)
              } catch (e: Exception) {
                // the code can still be typed by hand
              }
            }
          }
          stopReceiver()
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
    const val EVENT = "AzarSmsCode"
  }
}
