import RNFS from 'react-native-fs'
import type { AvailableUpdate } from './updateService'

/**
 * v1.2.0 (Amin #4223): the new version is fetched quietly in the
 * background, inside the app, into its private folder — the same folder
 * AzarInstallerModule accepts (android res/xml/azar_update_paths.xml).
 */
export const UPDATES_DIR = `${RNFS.DocumentDirectoryPath}/updates`

const inFlight = new Map<string, Promise<string | null>>()

function fileFor(version: string): string {
  return `${UPDATES_DIR}/azar-${version}.apk`
}

async function matches(path: string, sha256: string): Promise<boolean> {
  try {
    return (await RNFS.exists(path)) && (await RNFS.hash(path, 'sha256')).toLowerCase() === sha256
  } catch {
    return false
  }
}

async function removeOthers(keep: string[]): Promise<void> {
  const items = await RNFS.readDir(UPDATES_DIR)
  await Promise.all(
    items.filter((item) => !keep.includes(item.path)).map((item) => RNFS.unlink(item.path))
  )
}

async function download(update: AvailableUpdate): Promise<string | null> {
  const target = fileFor(update.version)
  const part = `${target}.part`
  try {
    await RNFS.mkdir(UPDATES_DIR)
    // Older downloads (and the file of the version now installed) are not needed any more.
    await removeOthers([target])
    if (await matches(target, update.sha256)) {
      return target
    }
    if (await RNFS.exists(target)) {
      await RNFS.unlink(target)
    }
    const result = await RNFS.downloadFile({
      fromUrl: update.downloadUrl,
      toFile: part,
      connectionTimeout: 30_000,
      readTimeout: 60_000
    }).promise
    if (result.statusCode !== 200 || !(await matches(part, update.sha256))) {
      // A cut-off or wrong file is thrown away and fetched again at the next check.
      await RNFS.unlink(part).catch(() => undefined)
      return null
    }
    await RNFS.moveFile(part, target)
    return target
  } catch {
    await RNFS.unlink(part).catch(() => undefined)
    return null
  }
}

/**
 * Returns the path of the checked install file for this update, or null
 * if it could not be fetched (offline, cut off, wrong checksum). Never
 * throws; a second call for the same version while one runs shares it.
 */
export function downloadUpdate(update: AvailableUpdate): Promise<string | null> {
  const running = inFlight.get(update.version)
  if (running) {
    return running
  }
  const job = download(update).finally(() => inFlight.delete(update.version))
  inFlight.set(update.version, job)
  return job
}

/** Frees the space once nothing newer is waiting (e.g. right after an update). */
export async function clearDownloadedUpdates(): Promise<void> {
  try {
    if (await RNFS.exists(UPDATES_DIR)) {
      await RNFS.unlink(UPDATES_DIR)
    }
  } catch {
    // best effort
  }
}
