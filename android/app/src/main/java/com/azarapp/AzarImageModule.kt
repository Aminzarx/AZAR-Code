package com.azarapp

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileOutputStream
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * v1.5.0 (Amin #4632): a picked picture becomes a small WebP in the app's own
 * files (the profile photo). The picture is read through the content resolver
 * (the picker's content:// address), turned upright by its EXIF orientation,
 * scaled so its long side is at most `maxSide`, and saved as WebP.
 */
class AzarImageModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "AzarImage"

  @ReactMethod
  fun toWebp(source: String, folder: String, name: String, maxSide: Int, quality: Int, promise: Promise) {
    Thread {
      try {
        val resolver = reactApplicationContext.contentResolver
        val uri = Uri.parse(source)

        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        resolver.openInputStream(uri).use { BitmapFactory.decodeStream(it, null, bounds) }
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
          promise.reject("not_an_image", "The chosen file is not a picture.")
          return@Thread
        }
        var sample = 1
        while (max(bounds.outWidth, bounds.outHeight) / (sample * 2) >= maxSide) sample *= 2
        val decoded = resolver.openInputStream(uri).use {
          BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample })
        } ?: run {
          promise.reject("not_an_image", "The chosen file is not a picture.")
          return@Thread
        }

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
        val matrix = Matrix().apply {
          if (scale != 1f) postScale(scale, scale)
          if (rotation != 0f) postRotate(rotation)
        }
        val upright = if (scale != 1f || rotation != 0f) {
          Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, matrix, true)
        } else {
          decoded
        }

        val dir = File(reactApplicationContext.filesDir, folder).apply { mkdirs() }
        val safeName = name.replace(Regex("[^A-Za-z0-9_-]"), "_")
        val out = File(dir, "$safeName.webp")
        @Suppress("DEPRECATION")
        val format = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) Bitmap.CompressFormat.WEBP_LOSSY else Bitmap.CompressFormat.WEBP
        FileOutputStream(out).use { upright.compress(format, quality.coerceIn(1, 100), it) }

        val result = Arguments.createMap().apply {
          putString("path", out.absolutePath)
          putDouble("bytes", out.length().toDouble())
          putInt("width", upright.width)
          putInt("height", upright.height)
        }
        if (upright !== decoded) upright.recycle()
        decoded.recycle()
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("convert_failed", e.message ?: "Could not convert the picture.", e)
      }
    }.start()
  }

  @ReactMethod
  fun remove(path: String, promise: Promise) {
    val file = File(path)
    val inside = file.canonicalPath.startsWith(reactApplicationContext.filesDir.canonicalPath + File.separator)
    promise.resolve(inside && file.delete())
  }
}
