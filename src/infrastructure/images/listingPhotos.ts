import { NativeModules, PermissionsAndroid, Platform } from 'react-native'

/**
 * Amin #5062: photos of a property file or a contract. Every picture, from the camera or the gallery, becomes a
 * WebP whose long side is at most 1600 px at quality 80. It is converted in memory (nothing is written to the
 * phone: option A) and re-encoding drops all EXIF data, the GPS position included. Its size is what it costs in
 * storage tokens.
 */
export const PHOTO_MAX_SIDE = 1600
export const PHOTO_QUALITY = 80
/** at most this many photos per file or contract */
export const MAX_PHOTOS = 10

export type ConvertedPhoto = { base64: string; bytes: number; width: number; height: number }

type AzarImagePhotos = {
  toWebpData(source: string, maxSide: number, quality: number): Promise<ConvertedPhoto>
  takePhoto(): Promise<{ uri: string; path: string } | null>
  pickImages(max: number): Promise<string[]>
  removeShot(path: string): Promise<boolean>
}

function native(): AzarImagePhotos {
  const module =
    Platform.OS === 'android' ? (NativeModules.AzarImage as AzarImagePhotos | undefined) : undefined
  if (!module) throw new Error('Photos can only be added on Android.')
  return module
}

/** Converts one picture (a content:// or file:// address) to the WebP kept for a file or contract. */
export function convertPhoto(source: string): Promise<ConvertedPhoto> {
  return native().toWebpData(source, PHOTO_MAX_SIDE, PHOTO_QUALITY)
}

/** Pictures chosen from the phone's gallery, converted; [] when the picker is closed. */
export async function pickPhotos(room: number): Promise<ConvertedPhoto[]> {
  if (room <= 0) return []
  // Amin #5416: the phone's photo picker, several pictures in one go (up to the room left)
  const picked = await native().pickImages(room)
  const photos: ConvertedPhoto[] = []
  for (const uri of picked.slice(0, room)) {
    photos.push(await convertPhoto(uri))
  }
  return photos
}

/** A new shot from the camera, converted; the camera's own temporary file is deleted at once. null = closed. */
export async function takePhoto(): Promise<ConvertedPhoto | null> {
  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA)
  if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new CameraPermissionError()
  }
  const shot = await native().takePhoto()
  if (!shot) return null
  try {
    return await convertPhoto(shot.uri)
  } finally {
    await native().removeShot(shot.path).catch(() => false)
  }
}

export class CameraPermissionError extends Error {
  constructor() {
    super('Camera permission was not given.')
    this.name = 'CameraPermissionError'
  }
}

/** How a stored photo is shown: from its bytes while they are on the phone. */
export function photoDataUri(base64: string): string {
  return `data:image/webp;base64,${base64}`
}
