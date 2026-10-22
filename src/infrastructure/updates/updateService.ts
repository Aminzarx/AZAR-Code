import { APP_VERSION } from '@shared/appVersion'
import { isNewerVersion } from '@shared/utils/semver'

/**
 * v1.1.0 (Amin #4216): the KSS server publishes the latest version as a
 * small JSON file next to the install file — reachable from Iran without
 * GitHub, and updated by KSS on every release:
 *   { "version": "1.1.0", "url": "https://api.zarandix.ir/app/azar-1.1.0.apk", "notes": "..." }
 */
const KSS_MANIFEST_URL = 'https://api.zarandix.ir/app/update.json'

/**
 * Fallback: the public GitHub API for this repo's latest release (the only
 * source app 1.0.0 knows, so every release is published there too).
 */
const RELEASES_API_URL = 'https://api.github.com/repos/Aminzarx/AZAR-Code/releases/latest'

export type AvailableUpdate = {
  version: string
  downloadUrl: string
  releaseNotes: string
}

type KssManifest = {
  version?: unknown
  url?: unknown
  notes?: unknown
}

type GithubReleaseAsset = {
  name: string
  browser_download_url: string
}

type GithubRelease = {
  tag_name: string
  body?: string | null
  assets?: GithubReleaseAsset[]
}

function parseVersionTag(tag: string): string {
  return tag.trim().replace(/^v/i, '')
}

async function fetchJson(url: string, headers?: Record<string, string>): Promise<unknown> {
  try {
    const response = await fetch(url, headers ? { headers } : undefined)
    if (!response.ok) {
      return null
    }
    return await response.json()
  } catch {
    return null
  }
}

/** `undefined` = the KSS file could not be read (try GitHub); `null` = read, nothing newer. */
async function fromKss(): Promise<AvailableUpdate | null | undefined> {
  const manifest = (await fetchJson(KSS_MANIFEST_URL)) as KssManifest | null
  if (
    !manifest ||
    typeof manifest.version !== 'string' ||
    typeof manifest.url !== 'string' ||
    !/^https:\/\//.test(manifest.url)
  ) {
    return undefined
  }
  const version = parseVersionTag(manifest.version)
  if (!version || !isNewerVersion(version, APP_VERSION)) {
    return null
  }
  return {
    version,
    downloadUrl: manifest.url,
    releaseNotes: typeof manifest.notes === 'string' ? manifest.notes : ''
  }
}

async function fromGithub(): Promise<AvailableUpdate | null> {
  const release = (await fetchJson(RELEASES_API_URL, {
    accept: 'application/vnd.github+json'
  })) as GithubRelease | null
  if (!release) {
    return null
  }

  const version = parseVersionTag(release.tag_name ?? '')
  if (!version || !isNewerVersion(version, APP_VERSION)) {
    return null
  }

  const apkAsset = release.assets?.find((asset) => asset.name.toLowerCase().endsWith('.apk'))
  if (!apkAsset) {
    return null
  }

  return {
    version,
    downloadUrl: apkAsset.browser_download_url,
    releaseNotes: release.body ?? ''
  }
}

/**
 * Checks the KSS server (then GitHub, if the KSS file can't be read)
 * against the running app's version. Returns `null` on any failure
 * (network, malformed response, no APK, or already up to date) rather
 * than throwing — an update check must never block or crash the app.
 */
export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  const kss = await fromKss()
  if (kss !== undefined) {
    return kss
  }
  return fromGithub()
}
