/* AVA's icons: the same component as IRIS (messaging/web/src/ui/icons.tsx); the paths are AVA's own, scripts/icons.mjs. */
/**
 * One icon set for the whole panel: Google Material Symbols, Rounded, weight 400, unfilled (Apache-2.0), as Amin asked
 * (MSG-REQ-A31: rounded, "neither too fat nor too thin"). The paths are generated into icon-paths.ts by
 * scripts/icons.mjs; pages ask for an icon by a stable name and the mapping lives only there.
 * Sizes (VISUAL-001 §37): 12 metadata, 16 standard, 18 controls, 20 navigation, 24 major actions, 32+ empty states.
 * Directional icons are mirrored for RTL; clocks, checks, media and search never are.
 */
import type { CSSProperties } from 'react';
import { PATHS } from './icon-paths';

// LTR-drawn icons that must face the other way in RTL (SEARCH-001 §88, STATE-001 §84)
const MIRROR = new Set(['external', 'logout', 'send']);

export function Icon({ name, size = 16, style, className, spin }: { name: string; size?: number; style?: CSSProperties; className?: string; spin?: boolean }) {
  const d = PATHS[name];
  if (!d) return null;
  return <svg width={size} height={size} viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" focusable="false"
    className={'ico ' + (spin ? 'spin ' : '') + (className || '')}
    style={{ flex: 'none', ...(MIRROR.has(name) ? { transform: 'scaleX(-1)' } : {}), ...style }}><path d={d} /></svg>;
}
