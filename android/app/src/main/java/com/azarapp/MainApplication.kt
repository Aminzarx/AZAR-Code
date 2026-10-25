package com.azarapp

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
          add(AzarRestartPackage())
          add(AzarInstallerPackage())
          add(AzarImagePackage())
          add(AzarAppearancePackage())
          add(AzarScreenPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    // Amin #5055: the saved light/dark choice before the first window draws
    AzarAppearanceModule.apply(this, AzarAppearanceModule.savedMode(this))
    loadReactNative(this)
  }
}
