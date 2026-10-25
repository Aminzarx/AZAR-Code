// EYVAN web: @react-native-documents/picker → <input type="file">. The picked files are blob: addresses.
export const types = { images: 'image/*', allFiles: '*/*', plainText: 'text/plain', json: 'application/json' }
export const errorCodes = { OPERATION_CANCELED: 'OPERATION_CANCELED', UNABLE_TO_OPEN_FILE_TYPE: 'UNABLE_TO_OPEN_FILE_TYPE' }

export function isErrorWithCode(error: unknown): error is Error & { code: string } {
  return error instanceof Error && typeof (error as { code?: unknown }).code === 'string'
}

export type PickedFile = { uri: string; name: string; size: number; type: string; file: File }

const cancelled = () => Object.assign(new Error('cancelled'), { code: errorCodes.OPERATION_CANCELED })

export function pick(options: { type?: string[]; allowMultiSelection?: boolean } = {}): Promise<PickedFile[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = (options.type ?? []).join(',')
    input.multiple = !!options.allowMultiSelection
    input.style.display = 'none'
    input.addEventListener('change', () => {
      const files = Array.from(input.files ?? [])
      input.remove()
      if (!files.length) return reject(cancelled())
      resolve(files.map((file) => ({ uri: URL.createObjectURL(file), name: file.name, size: file.size, type: file.type, file })))
    })
    input.addEventListener('cancel', () => {
      input.remove()
      reject(cancelled())
    })
    document.body.appendChild(input)
    input.click()
  })
}
