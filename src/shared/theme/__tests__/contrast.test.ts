import { darkColors, lightColors, type Palette } from '../tokens'

/** WCAG relative luminance and contrast ratio */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const SURFACES = [
  'background',
  'surface',
  'surfaceContainerLowest',
  'surfaceContainerLow',
  'surfaceContainer',
  'surfaceContainerHigh',
  'surfaceVariant',
  'field'
] as const
const TEXT_ON_SURFACES = ['onSurface', 'onSurfaceVariant', 'primary', 'error', 'secondary', 'tertiary'] as const

/** every «x» / «onX» pair, plus the text colours on every surface they are drawn on */
function pairs(palette: Palette): [string, string, number][] {
  const roles = Object.keys(palette) as (keyof Palette)[]
  const out: [string, string, number][] = []
  for (const role of roles) {
    const on = `on${role.charAt(0).toUpperCase()}${role.slice(1)}` as keyof Palette
    if (on in palette) out.push([on, role, contrast(palette[on], palette[role])])
  }
  for (const text of TEXT_ON_SURFACES) {
    for (const surface of SURFACES) out.push([text, surface, contrast(palette[text], palette[surface])])
  }
  return out
}

describe('night mode contrast (Amin #5055)', () => {
  it('every text/background pair of the dark palette keeps WCAG AA (4.5:1)', () => {
    const low = pairs(darkColors).filter(([, , ratio]) => ratio < 4.5)
    expect(low).toEqual([])
  })

  it('the dark palette fills every role of the light one', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort())
  })

  it('Amin #5242: page, cards and controls are told apart; borders show on cards and fields', () => {
    const c = darkColors
    expect(contrast(c.surfaceContainerLowest, c.background)).toBeGreaterThanOrEqual(1.15)
    expect(contrast(c.field, c.surfaceContainerLowest)).toBeGreaterThanOrEqual(1.15)
    expect(contrast(c.outline, c.surfaceContainerLowest)).toBeGreaterThanOrEqual(3)
    expect(contrast(c.outline, c.field)).toBeGreaterThanOrEqual(2.5)
  })
})
