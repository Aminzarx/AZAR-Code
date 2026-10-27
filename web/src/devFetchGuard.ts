/**
 * Dev only: the dev server talks to the live azar-auth. If the same API path is asked more than 5 times in 10 s,
 * further calls are refused here (and logged with where they came from), so a render loop can never flood the server.
 */
export function installDevFetchGuard(): void {
  const seen = new Map<string, number[]>()
  const real = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    // photo uploads come in a burst by design (one per photo of a saved file), so they are not counted
    if (url.includes('/api/') && !url.includes('/api/sync/blob/')) {
      const now = Date.now()
      const path = new URL(url, location.href).pathname
      const times = (seen.get(path) ?? []).filter((t) => now - t < 10_000)
      times.push(now)
      seen.set(path, times)
      if (times.length > 5) {
        console.error(`dev fetch guard: ${path} asked ${times.length}× in 10 s`, new Error().stack)
        return Promise.reject(new TypeError('dev fetch guard'))
      }
    }
    return real(input, init)
  }
}
