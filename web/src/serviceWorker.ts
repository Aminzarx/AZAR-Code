/** Registers public/sw.js (offline start of the app shell). Production only: the dev server needs fresh files. */
export function registerServiceWorker(): void {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return
  navigator.serviceWorker.register('/sw.js').catch(() => undefined)
}
