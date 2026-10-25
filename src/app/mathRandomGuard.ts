/**
 * Seen on 1.5.2 (2026-10-25, x86_64 emulator running the ARM build): Hermes' Math.random returned raw 64-bit
 * integers (1.7e19…) instead of numbers in [0, 1). React Navigation builds every navigator key from Math.random
 * (nanoid/non-secure), so all five tab stacks got the same key «stack-undefinedundefined…» and the back swipe
 * (Amin #5182), which targets the focused tab's stack by key, only ever reached the Settings stack.
 *
 * If Math.random is out of range it is replaced by mulberry32 seeded from the clock. Nothing here needs secure
 * randomness (keys and ids only); a working Math.random is left alone. Returns true when it had to replace it.
 */
export function guardMathRandom(): boolean {
  for (let i = 0; i < 8; i++) {
    const r = Math.random()
    if (!(r >= 0 && r < 1)) {
      const now = (globalThis as { performance?: { now?: () => number } }).performance?.now?.() ?? 0
      let seed = (Date.now() ^ Math.floor(now * 1000)) >>> 0
      const random = (): number => {
        seed = (seed + 0x6d2b79f5) | 0
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }
      Object.defineProperty(Math, 'random', { value: random, writable: true, configurable: true })
      return true
    }
  }
  return false
}

guardMathRandom()
