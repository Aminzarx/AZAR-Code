import { APP_VERSION } from '@shared/appVersion'
import { isNewerVersion } from '@shared/utils/semver'

/**
 * Public, unauthenticated GitHub API endpoint for this repo's latest
 * release — no server-side changes needed, and release versioning is
 * just git tags. See docs decision: GitHub Releases over the VPS
 * server/, since the APK needs a stable, publicly reachable download URL.
 */
const RELEASES_API_URL = 'https://api.github.com/repos/Aminzarx/AZAR-Code/releases/latest'

export type AvailableUpdate = {
  version: string
  downloadUrl: string
  releaseNotes: string
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

/**
 * Checks the latest GitHub release against the running app's version.
 * Returns `null` on any failure (network, malformed response, no APK
 * asset attached, or already up to date) rather than throwing — an
 * update check must never block or crash the app it's checking.
 */
export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  let response: Response
  try {
    response = await fetch(RELEASES_API_URL, {
      headers: { accept: 'application/vnd.github+json' }
    })
  } catch {
    return null
  }

  if (!response.ok) {
    return null
  }

  let release: GithubRelease
  try {
    release = (await response.json()) as GithubRelease
  } catch {
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
