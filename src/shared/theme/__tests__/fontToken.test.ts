import fs from 'fs'
import path from 'path'

/**
 * Amin #5543: «توکنش در اسناد ui درست تنظیم بشه و دیگه تکرار نشه». The font names live only in theme/tokens.ts
 * (docs/ui/design-system.md §2); a screen that writes one by hand, or names another family, fails the test run (and
 * so the build). Texts that name no font get Vazirmatn from FontText (babel-app-font.js, phone and web builds).
 */
const SRC = path.resolve(__dirname, '../../..')
const TOKENS = path.join(SRC, 'shared', 'theme', 'tokens.ts')

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full)
    return /\.(tsx?|jsx?)$/.test(entry.name) ? [full] : []
  })
}

describe('one source for the app font (Amin #5543)', () => {
  it('no font name outside theme/tokens.ts', () => {
    const found: string[] = []
    for (const file of sourceFiles(SRC)) {
      if (file === TOKENS) continue
      fs.readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .forEach((text, i) => {
          const code = text.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '')
          if (/['"`](Vazirmatn|IRANYekan|Roboto|sans-serif|serif|monospace|System)[^'"`]*['"`]/.test(code) || /fontFamily\s*:\s*['"`]/.test(code)) {
            found.push(`${path.relative(SRC, file)}:${i + 1}: ${text.trim()}`)
          }
        })
    }
    expect(found).toEqual([])
  })
})
