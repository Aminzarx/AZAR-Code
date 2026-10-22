import { DeviceEventEmitter, NativeModules, Platform } from 'react-native'

/** v1.2.0 (Amin #4229): android/app/src/main/java/com/azarapp/AzarSmsCodeModule.kt */
type AzarSmsCodeNative = {
  start(): Promise<boolean>
  stop(): void
}

const EVENT = 'AzarSmsCode'

function native(): AzarSmsCodeNative | undefined {
  return Platform.OS === 'android'
    ? (NativeModules.AzarSmsCode as AzarSmsCodeNative | undefined)
    : undefined
}

const PERSIAN_ARABIC_DIGITS = /[۰-۹٠-٩]/g

/** The first standalone run of exactly `length` digits (Persian or Latin) in an SMS, as Latin digits. */
export function extractCode(message: string, length: number): string | null {
  const latin = message.replace(PERSIAN_ARABIC_DIGITS, (d) => {
    const code = d.charCodeAt(0)
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660)
  })
  const match = latin.match(new RegExp(`(?<!\\d)\\d{${length}}(?!\\d)`))
  return match ? match[0] : null
}

/**
 * Waits (up to 5 minutes, Android's limit) for the next code SMS. Android
 * asks the user once whether AZAR may read that message; on allow,
 * `onCode` gets the code. Returns a function that stops listening. Does
 * nothing where unsupported (iOS, no Play services, tests).
 */
export function listenForSmsCode(length: number, onCode: (code: string) => void): () => void {
  const reader = native()
  if (!reader) {
    return () => undefined
  }
  const subscription = DeviceEventEmitter.addListener(EVENT, (message: string) => {
    const code = extractCode(message, length)
    if (code) {
      onCode(code)
    }
  })
  reader.start().catch(() => undefined)
  return () => {
    subscription.remove()
    reader.stop()
  }
}
