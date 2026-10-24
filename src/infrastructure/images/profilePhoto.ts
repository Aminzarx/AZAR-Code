import { NativeModules, Platform } from 'react-native'
import { pick, types, errorCodes, isErrorWithCode } from '@react-native-documents/picker'

type AzarImageNative = {
  toWebp(
    source: string,
    folder: string,
    name: string,
    maxSide: number,
    quality: number
  ): Promise<{ path: string; bytes: number; width: number; height: number }>
  remove(path: string): Promise<boolean>
}

const native: AzarImageNative | undefined =
  Platform.OS === 'android' ? (NativeModules.AzarImage as AzarImageNative | undefined) : undefined

/** long side of the saved photo, in pixels: sharp on the profile circle, a few dozen KB */
const PROFILE_PHOTO_SIDE = 512
const PROFILE_PHOTO_QUALITY = 80

/**
 * v1.5.0 (Amin #4632): the user picks a picture from the phone; it is saved
 * as WebP in the app's own files. Returns the saved file's path, or null when
 * the user closes the picker.
 */
export async function pickProfilePhoto(): Promise<string | null> {
  if (!native) {
    throw new Error('Pictures can only be changed on Android.')
  }
  let picked: Awaited<ReturnType<typeof pick>>
  try {
    picked = await pick({ mode: 'open', type: [types.images] })
  } catch (error) {
    if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
      return null
    }
    throw error
  }
  const [file] = picked
  if (!file) {
    return null
  }
  const saved = await native.toWebp(file.uri, 'profile', `photo-${Date.now()}`, PROFILE_PHOTO_SIDE, PROFILE_PHOTO_QUALITY)
  return saved.path
}

/** Deletes an earlier profile photo file (only files inside the app's own folder). */
export async function removeProfilePhotoFile(path: string | null | undefined): Promise<void> {
  if (path && native) {
    await native.remove(path).catch(() => false)
  }
}

export function photoUri(path: string | null | undefined): string | null {
  return path ? `file://${path}` : null
}
