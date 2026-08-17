import RNFS from 'react-native-fs'
import Share from 'react-native-share'
import { Buffer } from 'react-native-quick-crypto'
import {
  pick,
  keepLocalCopy,
  saveDocuments,
  errorCodes,
  isErrorWithCode
} from '@react-native-documents/picker'

const BACKUP_MIME_TYPE = 'application/octet-stream'

/**
 * Lets the user pick a `.azarbackup` file to import, decodes it to bytes.
 * On Android, `pick()` returns a `content://` uri that `react-native-fs`
 * cannot read directly — `keepLocalCopy` is the document-picker package's
 * own answer to that, copying it into the app's cache dir as a real
 * `file://` path first. Returns `null` if the user cancels the picker
 * (not an error — there is nothing to restore, not a failure to report).
 */
export async function pickBackupFileBytes(): Promise<Uint8Array | null> {
  let picked: Awaited<ReturnType<typeof pick>>
  try {
    picked = await pick({ mode: 'open' })
  } catch (error) {
    if (isUserCancellationError(error)) {
      return null
    }
    throw error
  }

  const [file] = picked
  if (!file) {
    return null
  }

  const [copy] = await keepLocalCopy({
    files: [{ uri: file.uri, fileName: file.name ?? 'backup.azarbackup' }],
    destination: 'cachesDirectory'
  })

  if (copy.status === 'error') {
    throw new Error(copy.copyError)
  }

  const localPath = copy.localUri.replace(/^file:\/\//, '')
  const base64Content = await RNFS.readFile(localPath, 'base64')
  return new Uint8Array(Buffer.from(base64Content, 'base64'))
}

/**
 * Opens Android's native "Save As" (Storage Access Framework) dialog so
 * the user picks the exact destination folder/name themselves, instead of
 * the file only ever landing in the app's private cache. Returns `false`
 * if the user cancels (also not an error).
 */
export async function saveBackupFileToDevice(path: string, fileName: string): Promise<boolean> {
  try {
    await saveDocuments({
      sourceUris: [`file://${path}`],
      fileName,
      mimeType: BACKUP_MIME_TYPE
    })
    return true
  } catch (error) {
    if (isUserCancellationError(error)) {
      return false
    }
    throw error
  }
}

/**
 * Hands the backup file to the OS share sheet (Telegram, WhatsApp, Drive,
 * ...) via `react-native-share`, which — unlike the RN core `Share` API —
 * ships its own Android `FileProvider` and converts the local `file://`
 * path into a proper `content://` uri before handing it to the target
 * app. Sharing a bare `file://` uri to another app on Android 7+ throws
 * `FileUriExposedException`; that was the actual cause of backups
 * silently failing to reach Telegram before this module existed.
 */
export async function shareBackupFile(path: string, fileName: string): Promise<boolean> {
  try {
    await Share.open({
      url: `file://${path}`,
      filename: fileName,
      type: BACKUP_MIME_TYPE,
      failOnCancel: false
    })
    return true
  } catch (error) {
    if (isUserCancellationError(error)) {
      return false
    }
    throw error
  }
}

function isUserCancellationError(error: unknown): boolean {
  if (isErrorWithCode(error)) {
    return error.code === errorCodes.OPERATION_CANCELED
  }
  // react-native-share's Android/iOS cancel paths (with failOnCancel:
  // false they normally resolve instead of rejecting, but some Android
  // versions still reject) surface as a rejected promise with a
  // cancellation message rather than a typed error code — matched
  // loosely so this stays agnostic of its exact error shape per platform.
  const message = error instanceof Error ? error.message : String(error)
  return /cancel/i.test(message)
}
