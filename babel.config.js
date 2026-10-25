const path = require('path')

const FONT_TEXT = path.join(__dirname, 'src', 'shared', 'components', 'FontText')
const SRC = path.join(__dirname, 'src') + path.sep

/**
 * Amin #5299: every Text/TextInput from 'react-native' in src/ comes from FontText instead (the app font when a style
 * names none). FontText itself still takes the real ones.
 */
function appFontText({ types: t }) {
  return {
    visitor: {
      ImportDeclaration(p, state) {
        const file = state.filename || ''
        if (p.node.source.value !== 'react-native' || !file.startsWith(SRC) || file.startsWith(FONT_TEXT)) return
        const moved = p.node.specifiers.filter(
          (s) => t.isImportSpecifier(s) && s.importKind !== 'type' && ['Text', 'TextInput'].includes(s.imported.name)
        )
        if (moved.length === 0) return
        p.node.specifiers = p.node.specifiers.filter((s) => !moved.includes(s))
        let rel = path.relative(path.dirname(file), FONT_TEXT).split(path.sep).join('/')
        if (!rel.startsWith('.')) rel = `./${rel}`
        p.insertAfter(t.importDeclaration(moved, t.stringLiteral(rel)))
        if (p.node.specifiers.length === 0) p.remove()
      }
    }
  }
}

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    appFontText,
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        alias: {
          '@app': './src/app',
          '@navigation': './src/navigation',
          '@core': './src/core',
          '@features': './src/features',
          '@shared': './src/shared',
          '@infrastructure': './src/infrastructure'
        }
      }
    ]
  ]
}
