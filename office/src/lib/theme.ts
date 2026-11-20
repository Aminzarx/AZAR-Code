/**
 * Light or dark, per browser. Applied before anything draws, so the sign-in screen and the lab follow it too (audit P-14).
 * Light is the default, as in IRIS: KSS UI has no dark baseline, and the dark palette is IRIS's documented extension.
 */
export type Theme = 'light' | 'dark';
const KEY = 'pva.theme';

export function storedTheme(): Theme {
  try { return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
}

export function applyTheme(t: Theme = storedTheme()) {
  // light is set by name too, so the shared toast (TOAST-9571) stays light on a light page when the OS is dark
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(KEY, t); } catch { /* private mode: this page only */ }
}
