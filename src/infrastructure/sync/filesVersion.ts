/**
 * Option A (Amin #4826): the account's files can arrive from the server while a list is already on screen (the
 * phone came back online). The data layer bumps this number then; lists that show files re-read when it changes.
 */
let version = 0
const listeners = new Set<() => void>()

export function bumpFilesVersion(): void {
  version += 1
  for (const listener of listeners) listener()
}

export function getFilesVersion(): number {
  return version
}

export function subscribeFilesVersion(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
