import { NativeModules, PermissionsAndroid, Platform } from 'react-native'
import RNFS from 'react-native-fs'

/**
 * Amin #5062: photos of a property file or a contract. Every picture, from the camera or the gallery, becomes a
 * WebP whose long side is at most 1280 px at quality 72. It is converted in memory (nothing is written to the
 * phone: option A) and re-encoding drops all EXIF data, the GPS position included. Its size is what it costs in
 * storage tokens.
 */
// Amin #5433: 1280 px at quality 72 (was 1600/80): smaller photos, so they cost fewer tokens
export const PHOTO_MAX_SIDE = 1280
export const PHOTO_QUALITY = 72
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
  let failure: unknown = null
  // Amin #5599: a picture the phone will not hand over is skipped; the rest are still added
  for (const uri of picked.slice(0, room)) {
    try {
      photos.push(await convertPhoto(uri))
    } catch (error) {
      failure = error
    }
  }
  if (failure !== null && photos.length === 0) throw failure
  return photos
}

/**
 * Navid 2026-10-27 «ورود آگهی از دیوار»: a post's pictures (Divar's own picture addresses), each downloaded to the
 * app's cache only for as long as it takes to convert it, then removed. A picture that fails is skipped.
 */
export async function importPhotos(urls: readonly string[], room: number): Promise<ConvertedPhoto[]> {
  const photos: ConvertedPhoto[] = []
  for (const [n, url] of urls.slice(0, Math.max(0, room)).entries()) {
    const path = `${RNFS.CachesDirectoryPath}/divar-${Date.now()}-${n}`
    try {
      const { statusCode } = await RNFS.downloadFile({ fromUrl: url, toFile: path, readTimeout: 15000 }).promise
      if (statusCode === 200) photos.push(await convertPhoto(`file://${path}`))
    } catch {
      // skipped
    } finally {
      await RNFS.unlink(path).catch(() => undefined)
    }
  }
  return photos
}

/**
 * Amin #5599: the native reason behind a failed add (no_access, not_found, too_big, convert_failed, no_gallery …), shown
 * in small print so a report from a phone says what went wrong.
 */
export function photoErrorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code
  return typeof code === 'string' && code.length > 0 ? code : 'unknown'
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
