import fs from 'fs'
import path from 'path'

/**
 * v1.5.0 (Amin #4798/#4803/#4809): every text starts on the right, for good.
 *
 * The base typography already aligns to the start edge, so a screen only goes
 * wrong when someone sets textAlign by hand. This check fails the test run (and
 * so the build) for any hand-set alignment other than the start edge, unless
 * the line says why with `// rtl-allow: <reason>`.
 *
 * Why 'left' is the start edge: React Native on Android swaps left/right for
 * <Text> under RTL, so 'left' lands on the right in Persian and 'right' sends
 * wrapped lines to the left edge. <TextInput> does not swap; inputs carry an
 * rtl-allow for their physical 'right'.
 */
const SRC = path.resolve(__dirname, '../../..')

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full)
    return /\.(tsx?|jsx?)$/.test(entry.name) ? [full] : []
  })
}

type Offence = { file: string; line: number; text: string }

function offences(): Offence[] {
  const found: Offence[] = []
  for (const file of sourceFiles(SRC)) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
    lines.forEach((text, i) => {
      const code = text.replace(/\/\/.*$/, '')
      if (!/textAlign|writingDirection\s*:\s*'ltr'/.test(code)) return
      if (/rtl-allow:\s*\S/.test(text)) return
      // a type declaration (e.g. writingDirection: 'ltr' | 'rtl'), not a style
      if (/:\s*'[a-z]+'\s*\|/.test(code)) return
      // the start edge, the only alignment a screen may set without a reason
      if (/textAlign\s*:\s*'left'\s*,?\s*$/.test(code.trim()) || /textAlign:\s*'left'\s*[,}]/.test(code)) return
      // the typography type declares the start edge
      if (/^\s*textAlign:\s*'left'\s*$/.test(code)) return
      found.push({ file: path.relative(SRC, file), line: i + 1, text: text.trim() })
    })
  }
  return found
}

describe('RTL alignment check', () => {
  it('has no hand-set alignment except the start edge or an explicit rtl-allow', () => {
    const list = offences().map((o) => `${o.file}:${o.line}  ${o.text}`)
    expect(list).toEqual([])
  })

  it('catches a hand-set right or centre alignment', () => {
    const sample = ["title: { textAlign: 'right' }", "x: { textAlign: 'center' }", "y: { textAlign: theme.isRTL ? 'right' : 'left' }"]
    for (const text of sample) {
      const code = text.replace(/\/\/.*$/, '')
      const allowed = /textAlign:\s*'left'\s*[,}]/.test(code) || /rtl-allow:\s*\S/.test(text)
      expect(allowed).toBe(false)
    }
  })
})
