import { guardMathRandom } from '../mathRandomGuard'

describe('guardMathRandom', () => {
  const original = Math.random

  afterEach(() => {
    Object.defineProperty(Math, 'random', { value: original, writable: true, configurable: true })
  })

  it('leaves a working Math.random alone', () => {
    expect(guardMathRandom()).toBe(false)
    expect(Math.random).toBe(original)
  })

  it('replaces a Math.random that returns raw integers (seen on 1.5.2) with one in [0, 1)', () => {
    Object.defineProperty(Math, 'random', { value: () => 17335745144860877000, writable: true, configurable: true })
    expect(guardMathRandom()).toBe(true)
    const samples = Array.from({ length: 1000 }, () => Math.random())
    expect(samples.every((r) => r >= 0 && r < 1)).toBe(true)
    expect(new Set(samples).size).toBeGreaterThan(990)
  })
})
