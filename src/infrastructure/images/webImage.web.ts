/**
 * EYVAN web (#5183): a picture the user chose, re-drawn on a canvas at most `maxSide` px on its long side and saved
 * as WebP (JPEG where the browser cannot write WebP, e.g. older Safari). Re-drawing drops all EXIF, the GPS position
 * included, as on the phone (Amin #5062).
 */
export type WebImage = { base64: string; bytes: number; width: number; height: number; type: string }

export async function convertImage(source: Blob, maxSide: number, quality: number): Promise<WebImage> {
  const bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser cannot draw pictures.')
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality / 100))
  let blob = await encode('image/webp')
  if (!blob || blob.type !== 'image/webp') blob = await encode('image/jpeg')
  if (!blob) throw new Error('The picture could not be converted.')
  const buffer = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < buffer.length; i += 0x8000) binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000))
  return { base64: btoa(binary), bytes: buffer.length, width, height, type: blob.type }
}

/** opens the file chooser (or the camera with `capture`); null when it is closed without a choice */
export function chooseImages(options: { multiple?: boolean; capture?: boolean } = {}): Promise<File[] | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = !!options.multiple
    if (options.capture) input.setAttribute('capture', 'environment')
    input.style.display = 'none'
    const finish = (files: File[] | null) => {
      input.remove()
      resolve(files && files.length ? files : null)
    }
    input.addEventListener('change', () => finish(Array.from(input.files ?? [])))
    input.addEventListener('cancel', () => finish(null))
    document.body.appendChild(input)
    input.click()
  })
}
