import RNFS, { peekDataUri } from 'react-native-fs'
import { chooseImages, convertImage } from './webImage.web'

/**
 * EYVAN web (#5183): profilePhoto.ts for the browser. The picture is kept, sealed, in the browser's own store (the
 * fs shim) under the same kind of path the phone uses, so the rest of the app does not change.
 */
const PROFILE_PHOTO_SIDE = 512
const PROFILE_PHOTO_QUALITY = 80

export async function pickProfilePhoto(): Promise<string | null> {
  const files = await chooseImages()
  if (!files) return null
  const image = await convertImage(files[0], PROFILE_PHOTO_SIDE, PROFILE_PHOTO_QUALITY)
  const path = `${RNFS.DocumentDirectoryPath}/profile/photo-${Date.now()}.webp`
  await RNFS.writeFile(path, image.base64, 'base64')
  return path
}

export async function removeProfilePhotoFile(path: string | null | undefined): Promise<void> {
  if (path && path.startsWith(RNFS.DocumentDirectoryPath + '/')) await RNFS.unlink(path).catch(() => undefined)
}

export function photoUri(path: string | null | undefined): string | null {
  return path ? peekDataUri(path) : null
}
