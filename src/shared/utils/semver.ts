/** Compares two dot-separated numeric version strings (e.g. "1.2.10" vs "1.3.0"). */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number)
  const partsB = b.split('.').map(Number)
  const length = Math.max(partsA.length, partsB.length)

  for (let index = 0; index < length; index += 1) {
    const numA = partsA[index] ?? 0
    const numB = partsB[index] ?? 0
    if (numA !== numB) {
      return numA - numB
    }
  }

  return 0
}

export function isNewerVersion(candidate: string, current: string): boolean {
  return compareVersions(candidate, current) > 0
}
