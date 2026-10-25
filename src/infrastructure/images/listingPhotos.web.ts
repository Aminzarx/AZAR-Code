import { chooseImages, convertImage } from './webImage.web'

/**
 * EYVAN web (#5183): listingPhotos.ts for the browser. Same rules (Amin #5062): long side at most 1600 px, quality
 * 80, converted in memory only, EXIF dropped. The camera is the phone's own (the file chooser's «take photo»).
 */
export const PHOTO_MAX_SIDE = 1600
export const PHOTO_QUALITY = 80
/** at most this many photos per file or contract */
export const MAX_PHOTOS = 10

export type ConvertedPhoto = { base64: string; bytes: number; width: number; height: number }

const fromBlob = async (blob: Blob): Promise<ConvertedPhoto> => {
  const { base64, bytes, width, height } = await convertImage(blob, PHOTO_MAX_SIDE, PHOTO_QUALITY)
  return { base64, bytes, width, height }
}

/** Converts one picture (a blob: or data: address) to the photo kept for a file or contract. */
export async function convertPhoto(source: string): Promise<ConvertedPhoto> {
  return fromBlob(await (await fetch(source)).blob())
}

/** Pictures chosen from the phone's gallery, converted; [] when the chooser is closed. */
export async function pickPhotos(room: number): Promise<ConvertedPhoto[]> {
  if (room <= 0) return []
  const files = await chooseImages({ multiple: room > 1 })
  const photos: ConvertedPhoto[] = []
  for (const file of (files ?? []).slice(0, room)) photos.push(await fromBlob(file))
  return photos
}

/** A new shot from the camera, converted. null = closed. */
export async function takePhoto(): Promise<ConvertedPhoto | null> {
  const files = await chooseImages({ capture: true })
  return files ? fromBlob(files[0]) : null
}

export class CameraPermissionError extends Error {
  constructor() {
    super('Camera permission was not given.')
    this.name = 'CameraPermissionError'
  }
}

/** How a stored photo is shown: from its bytes (the browser reads WebP and JPEG alike). */
export function photoDataUri(base64: string): string {
  return `data:image/webp;base64,${base64}`
}
