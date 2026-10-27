package com.azarapp

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.util.Base64
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream
import kotlin.math.max

/**
 * v1.5.0 (Amin #4632): a picked picture becomes a small WebP in the app's own
 * files (the profile photo). The picture is read through the content resolver
 * (the picker's content:// address), turned upright by its EXIF orientation,
 * scaled so its long side is at most `maxSide`, and saved as WebP.
 *
 * Amin #5062 (file and contract photos): `toWebpData` does the same but keeps the WebP in memory and hands back its
 * bytes (base64), so nothing of the picture is written to the phone (option A: it waits only in the encrypted
 * queue until it is on the server). Re-encoding the pixels drops every EXIF field, GPS position included.
 * `takePhoto` opens the phone's camera; the shot goes to a temporary file in the app's cache, which the app deletes
 * as soon as it has been converted (`removeShot`).
 */
class AzarImageModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var cameraPromise: Promise? = null
  private var cameraShot: File? = null
  private var pickPromise: Promise? = null

  init {
    reactContext.addActivityEventListener(object : BaseActivityEventListener() {
      override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == PICK_REQUEST) {
          val promise = pickPromise ?: return
          pickPromise = null
          val uris = Arguments.createArray()
          if (resultCode == Activity.RESULT_OK && data != null) {
            val clip = data.clipData
            if (clip != null) {
              for (i in 0 until clip.itemCount) uris.pushString(clip.getItemAt(i).uri.toString())
            } else {
              data.data?.let { uris.pushString(it.toString()) }
            }
          }
          promise.resolve(uris)
          return
        }
        if (requestCode != CAMERA_REQUEST) return
        val promise = cameraPromise ?: return
        val shot = cameraShot
        cameraPromise = null
        cameraShot = null
        if (resultCode == Activity.RESULT_OK && shot != null && shot.length() > 0) {
          promise.resolve(Arguments.createMap().apply {
            putString("uri", Uri.fromFile(shot).toString())
            putString("path", shot.absolutePath)
          })
        } else {
          shot?.delete()
          promise.resolve(null)
        }
      }
    })
  }

  override fun getName() = "AzarImage"

  /** Reads the picture, scaled down (long side ≤ maxSide) and turned upright; null when it is not a picture. */
  private fun upright(source: String, maxSide: Int): Bitmap? {
    val resolver = reactApplicationContext.contentResolver
    val uri = Uri.parse(source)

    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    resolver.openInputStream(uri).use { BitmapFactory.decodeStream(it, null, bounds) }
    // Amin #5599: what BitmapFactory cannot read (some phones' HEIF/HEIC shots) goes through ImageDecoder, which also
    // turns the picture upright by itself
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return decodedByImageDecoder(uri, maxSide)
    var sample = 1
    while (max(bounds.outWidth, bounds.outHeight) / (sample * 2) >= maxSide) sample *= 2
    val decoded = resolver.openInputStream(uri).use {
      BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample })
    } ?: return null

    val rotation = try {
      resolver.openInputStream(uri).use { stream ->
        when (stream?.let { ExifInterface(it) }?.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
          ExifInterface.ORIENTATION_ROTATE_90 -> 90f
          ExifInterface.ORIENTATION_ROTATE_180 -> 180f
          ExifInterface.ORIENTATION_ROTATE_270 -> 270f
          else -> 0f
        }
      }
    } catch (_: Exception) {
      0f
    }

    val longSide = max(decoded.width, decoded.height)
    val scale = if (longSide > maxSide) maxSide.toFloat() / longSide else 1f
    if (scale == 1f && rotation == 0f) return decoded
    val matrix = Matrix().apply {
      if (scale != 1f) postScale(scale, scale)
      if (rotation != 0f) postRotate(rotation)
    }
    val turned = Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, matrix, true)
    if (turned !== decoded) decoded.recycle()
    return turned
  }

  private fun decodedByImageDecoder(uri: Uri, maxSide: Int): Bitmap? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return null
    val source = ImageDecoder.createSource(reactApplicationContext.contentResolver, uri)
    return ImageDecoder.decodeBitmap(source) { decoder, info, _ ->
      decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
      val longSide = max(info.size.width, info.size.height)
      if (longSide > maxSide) {
        val scale = maxSide.toFloat() / longSide
        decoder.setTargetSize((info.size.width * scale).toInt().coerceAtLeast(1), (info.size.height * scale).toInt().coerceAtLeast(1))
      }
    }
  }

  private fun writeWebp(bitmap: Bitmap, quality: Int, out: OutputStream) {
    @Suppress("DEPRECATION")
    val format = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) Bitmap.CompressFormat.WEBP_LOSSY else Bitmap.CompressFormat.WEBP
    bitmap.compress(format, quality.coerceIn(1, 100), out)
  }

  private fun sizeOf(map: WritableMap, bitmap: Bitmap, bytes: Long): WritableMap = map.apply {
    putDouble("bytes", bytes.toDouble())
    putInt("width", bitmap.width)
    putInt("height", bitmap.height)
  }

  @ReactMethod
  fun toWebp(source: String, folder: String, name: String, maxSide: Int, quality: Int, promise: Promise) {
    Thread {
      try {
        val bitmap = upright(source, maxSide) ?: run {
          promise.reject("not_an_image", "The chosen file is not a picture.")
          return@Thread
        }
        val dir = File(reactApplicationContext.filesDir, folder).apply { mkdirs() }
        val safeName = name.replace(Regex("[^A-Za-z0-9_-]"), "_")
        val out = File(dir, "$safeName.webp")
        FileOutputStream(out).use { writeWebp(bitmap, quality, it) }
        val result = sizeOf(Arguments.createMap().apply { putString("path", out.absolutePath) }, bitmap, out.length())
        bitmap.recycle()
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("convert_failed", e.message ?: "Could not convert the picture.", e)
      }
    }.start()
  }

  /** Amin #5062: the WebP stays in memory; returns { base64, bytes, width, height }. */
  @ReactMethod
  fun toWebpData(source: String, maxSide: Int, quality: Int, promise: Promise) {
    Thread {
      try {
        val bitmap = upright(source, maxSide) ?: run {
          promise.reject("not_an_image", "The chosen file is not a picture.")
          return@Thread
        }
        val buffer = ByteArrayOutputStream()
        writeWebp(bitmap, quality, buffer)
        val bytes = buffer.toByteArray()
        val result = sizeOf(
          Arguments.createMap().apply { putString("base64", Base64.encodeToString(bytes, Base64.NO_WRAP)) },
          bitmap,
          bytes.size.toLong()
        )
        bitmap.recycle()
        promise.resolve(result)
      } catch (e: SecurityException) {
        promise.reject("no_access", e.message ?: "The picture could not be read.", e)
      } catch (e: java.io.FileNotFoundException) {
        promise.reject("not_found", e.message ?: "The picture was not found.", e)
      } catch (e: OutOfMemoryError) {
        promise.reject("too_big", "The picture is too big.", e)
      } catch (e: Throwable) {
        promise.reject("convert_failed", e.message ?: "Could not convert the picture.", e)
      }
    }.start()
  }

  /** Amin #5062: the phone's camera; resolves { uri, path } of the temporary shot, or null when closed. */
  @ReactMethod
  fun takePhoto(promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("no_activity", "The app is not in front.")
      return
    }
    // Amin #5599: a camera answer that never came back (the phone closed the app's page meanwhile) must not block
    // every later shot: the old wait ends empty and this one goes on
    cameraPromise?.resolve(null)
    cameraPromise = null
    cameraShot?.delete()
    cameraShot = null
    try {
      val dir = File(reactApplicationContext.cacheDir, "camera").apply { mkdirs() }
      val shot = File(dir, "shot-${System.currentTimeMillis()}.jpg")
      val uri = FileProvider.getUriForFile(activity, "${activity.packageName}.updates", shot)
      val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
        putExtra(MediaStore.EXTRA_OUTPUT, uri)
        addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      cameraPromise = promise
      cameraShot = shot
      activity.startActivityForResult(intent, CAMERA_REQUEST)
    } catch (e: Exception) {
      cameraPromise = null
      cameraShot = null
      promise.reject("no_camera", e.message ?: "Could not open the camera.", e)
    }
  }

  /**
   * Amin #5416: several pictures at once from the gallery, at most `max`. Android 13+ shows its own photo picker
   * (one tap per picture, a count on the button); older phones get the document picker with multi-select. Resolves the
   * pictures' addresses ([] when closed).
   */
  @ReactMethod
  fun pickImages(max: Int, promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("no_activity", "The app is not in front.")
      return
    }
    // Amin #5599: same for a gallery answer that never came back
    pickPromise?.resolve(Arguments.createArray())
    pickPromise = null
    try {
      pickPromise = promise
      if (Build.VERSION.SDK_INT >= 33) {
        val limit = try { minOf(max, MediaStore.getPickImagesMaxLimit()) } catch (_: Throwable) { max }
        val photoPicker = Intent(MediaStore.ACTION_PICK_IMAGES).apply {
          type = "image/*"
          if (limit > 1) putExtra(MediaStore.EXTRA_PICK_IMAGES_MAX, limit)
        }
        try {
          activity.startActivityForResult(photoPicker, PICK_REQUEST)
          return
        } catch (_: ActivityNotFoundException) {
          // a phone without the system photo picker: the document picker below
        }
      }
      // Amin #5599: the document picker (what 1.5.5 used, and it worked on every phone) instead of the gallery app's
      // GET_CONTENT, whose answers some gallery apps give without the right to read them
      val documents = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
        type = "image/*"
        addCategory(Intent.CATEGORY_OPENABLE)
        putExtra(Intent.EXTRA_ALLOW_MULTIPLE, max > 1)
      }
      activity.startActivityForResult(documents, PICK_REQUEST)
    } catch (e: Exception) {
      pickPromise = null
      promise.reject("no_gallery", e.message ?: "Could not open the gallery.", e)
    }
  }

  /** Deletes a temporary camera shot (only inside the app's cache/camera folder). */
  @ReactMethod
  fun removeShot(path: String, promise: Promise) {
    val file = File(path)
    val dir = File(reactApplicationContext.cacheDir, "camera").canonicalPath + File.separator
    promise.resolve(file.canonicalPath.startsWith(dir) && file.delete())
  }

  @ReactMethod
  fun remove(path: String, promise: Promise) {
    val file = File(path)
    val inside = file.canonicalPath.startsWith(reactApplicationContext.filesDir.canonicalPath + File.separator)
    promise.resolve(inside && file.delete())
  }

  private companion object {
    const val CAMERA_REQUEST = 5062
    const val PICK_REQUEST = 5416
  }
}
