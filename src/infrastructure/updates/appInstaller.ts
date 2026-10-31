import { NativeModules, Platform } from 'react-native'

/** v1.2.0 (Amin #4223): android/app/src/main/java/com/azarapp/AzarInstallerModule.kt */
type AzarInstallerNative = {
  canInstall(): Promise<boolean>
  openInstallPermission(): Promise<void>
  install(path: string): Promise<void>
}

function native(): AzarInstallerNative | undefined {
  return Platform.OS === 'android'
    ? (NativeModules.AzarInstaller as AzarInstallerNative | undefined)
    : undefined
}

/** True where the app can install its own update (Android with the native module). */
export function isInAppInstallSupported(): boolean {
  return native() !== undefined
}

/** Whether Android already lets AZAR install updates (the one-time "from this source" permission). */
export async function canInstallUpdates(): Promise<boolean> {
  try {
    return (await native()?.canInstall()) ?? false
  } catch {
    return false
  }
}

/** Opens Android's "install unknown apps" page for AZAR only. */
export async function openInstallPermission(): Promise<void> {
  await native()?.openInstallPermission()
}

/** Hands a downloaded, checked update file to Android's installer (shown over the app). */
export async function installUpdate(path: string): Promise<void> {
  const installer = native()
  if (!installer) {
    throw new Error('in-app install not supported')
  }
  await installer.install(path)
}
