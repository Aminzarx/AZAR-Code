import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "AzarApp",
      in: window,
      launchOptions: launchOptions
    )

    // Amin #4946: the files never show in a screen recording, mirroring or the app switcher
    let center = NotificationCenter.default
    center.addObserver(self, selector: #selector(updatePrivacyCover), name: UIScreen.capturedDidChangeNotification, object: nil)
    center.addObserver(self, selector: #selector(coverForSwitcher), name: UIApplication.willResignActiveNotification, object: nil)
    center.addObserver(self, selector: #selector(updatePrivacyCover), name: UIApplication.didBecomeActiveNotification, object: nil)
    updatePrivacyCover()

    return true
  }

  private var privacyCover: UIView?

  @objc private func coverForSwitcher() { showPrivacyCover(true) }

  @objc private func updatePrivacyCover() { showPrivacyCover(UIScreen.main.isCaptured) }

  private func showPrivacyCover(_ show: Bool) {
    guard let window = window else { return }
    if show {
      if privacyCover != nil { return }
      let cover = UIView(frame: window.bounds)
      cover.autoresizingMask = [.flexibleWidth, .flexibleHeight]
      cover.backgroundColor = UIColor(red: 0xF8 / 255.0, green: 0xFA / 255.0, blue: 0xFC / 255.0, alpha: 1)
      window.addSubview(cover)
      privacyCover = cover
    } else {
      privacyCover?.removeFromSuperview()
      privacyCover = nil
    }
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
