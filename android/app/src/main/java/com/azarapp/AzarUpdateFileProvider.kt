package com.azarapp

import androidx.core.content.FileProvider

/**
 * Own subclass so its manifest entry does not collide with the
 * FileProvider entries that libraries (react-native-share) merge in.
 */
class AzarUpdateFileProvider : FileProvider()
