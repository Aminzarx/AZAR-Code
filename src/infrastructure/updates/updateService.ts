import { APP_VERSION } from '@shared/appVersion'
import { isNewerVersion } from '@shared/utils/semver'

/**
 * The KSS server publishes the latest version as a small JSON file next
 * to the install file — reachable from Iran, updated by KSS on every
 * release (v1.1.0, Amin #4216):
 *   { "version": "1.2.0", "url": "https://api.zarandix.ir/app/azar-1.2.0.apk",
 *     "sha256": "<64 hex>", "notes": "..." }
 * v1.2.0 (Amin #4223): GitHub is no longer asked, and only install files
 * on that same KSS folder are accepted; sha256 lets the app check the
 * downloaded file before installing it.
 */
export const KSS_MANIFEST_URL = 'https://api.zarandix.ir/app/update.json'
const KSS_FILES_PREFIX = 'https://api.zarandix.ir/app/'

export type AvailableUpdate = {
  version: string
  downloadUrl: string
  /** Lower-case hex sha256 of the install file. */
  sha256: string
  releaseNotes: string
}

type KssManifest = {
  version?: unknown
  url?: unknown
  sha256?: unknown
  notes?: unknown
}

async function fetchJson(url: string): Promise<unknown> {
  try {
    const response = await fetch(url, { headers: { 'cache-control': 'no-cache' } })
    if (!response.ok) {
      return null
    }
    return await response.json()
  } catch {
    return null
  }
}

/**
 * Checks the KSS server against the running app's version. Returns
 * `null` on any failure (network, malformed file, link outside the KSS
 * folder, missing checksum, already up to date) rather than throwing —
 * an update check must never block or crash the app.
 */
export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  const manifest = (await fetchJson(KSS_MANIFEST_URL)) as KssManifest | null
  if (
    !manifest ||
    typeof manifest.version !== 'string' ||
    typeof manifest.url !== 'string' ||
    !manifest.url.startsWith(KSS_FILES_PREFIX) ||
    typeof manifest.sha256 !== 'string' ||
    !/^[0-9a-f]{64}$/i.test(manifest.sha256)
  ) {
    return null
  }
  const version = manifest.version.trim().replace(/^v/i, '')
  if (!version || !isNewerVersion(version, APP_VERSION)) {
    return null
  }
  return {
    version,
    downloadUrl: manifest.url,
    sha256: manifest.sha256.toLowerCase(),
    releaseNotes: typeof manifest.notes === 'string' ? manifest.notes : ''
  }
}
