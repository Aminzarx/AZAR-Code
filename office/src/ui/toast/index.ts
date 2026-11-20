// The shared KSS glass toast (B2B chain docs/design-system/toast, CHG-022 item 13). toast.js/.css/.d.ts are copied as they
// are and never edited; this file only loads them for the office dashboard. toast.js is UMD: as a bundled CommonJS
// module it gives its API as the default export; served as plain ESM (vite dev) it sets window.KssToast instead.
import './toast.css';
import * as mod from './toast.js';
import type { KssToastApi } from './toast.js';

const api = (): KssToastApi => (mod as { default?: KssToastApi }).default ?? (window as unknown as { KssToast: KssToastApi }).KssToast;
export const KssToast: KssToastApi = {
  show: (m, o) => api().show(m, o),
  success: (m, t, ms) => api().success(m, t, ms),
  error: (m, t, ms) => api().error(m, t, ms),
  warning: (m, t, ms) => api().warning(m, t, ms),
  info: (m, t, ms) => api().info(m, t, ms),
  clear: () => api().clear(),
};
