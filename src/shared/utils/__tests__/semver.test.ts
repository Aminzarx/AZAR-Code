import { compareVersions, isNewerVersion } from '../semver'

describe('compareVersions', () => {
  it('returns 0 for equal versions', () => {
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0)
  })

  it('returns a positive number when the first version is newer', () => {
    expect(compareVersions('1.3.0', '1.2.9')).toBeGreaterThan(0)
  })

  it('returns a negative number when the first version is older', () => {
    expect(compareVersions('1.2.9', '1.3.0')).toBeLessThan(0)
  })

  it('compares multi-digit segments numerically, not lexically', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0)
  })

  it('treats a missing trailing segment as 0', () => {
    expect(compareVersions('1.2', '1.2.0')).toBe(0)
    expect(compareVersions('1.2.1', '1.2')).toBeGreaterThan(0)
  })
})

describe('isNewerVersion', () => {
  it('is true when the candidate is newer than current', () => {
    expect(isNewerVersion('2.0.0', '1.9.9')).toBe(true)
  })

  it('is false when the candidate is the same as current', () => {
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false)
  })

  it('is false when the candidate is older than current', () => {
    expect(isNewerVersion('1.0.0', '1.1.0')).toBe(false)
  })
})
