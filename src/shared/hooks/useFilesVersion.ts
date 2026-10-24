import { useSyncExternalStore } from 'react'
import { getFilesVersion, subscribeFilesVersion } from '@infrastructure/sync/filesVersion'

/** Changes whenever the account's files were (re)loaded from the server — add it to a list's reload key. */
export function useFilesVersion(): number {
  return useSyncExternalStore(subscribeFilesVersion, getFilesVersion)
}
