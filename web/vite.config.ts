// EYVAN web (#5183): the app in ../src through react-native-web. Native modules are swapped for the files in
// src/shims (same exports, browser underneath); everything else is the phone app's own code.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Amin #5543: the phone build's font rule (babel-app-font.js) on the web too — react-native-web's own Text is the system font
import { createRequire } from 'node:module'
const appFontText = createRequire(import.meta.url)('../babel-app-font.js')
import path from 'node:path'
import { transformWithEsbuild, type Plugin } from 'vite'

/** some React Native libraries ship JSX in plain .js files; turn it into JS before the bundler reads them */
function jsxInNodeModules(): Plugin {
  return {
    name: 'eyvan-jsx-in-node-modules',
    enforce: 'pre',
    async transform(code, id) {
      if (!/node_modules[\/].*\.js$/.test(id) || !/<[A-Za-z]/.test(code)) return null
      return transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'automatic' })
    }
  }
}

/** the phone code loads pictures with require('x.png'); on the web that becomes an import of the file's address */
function requireAssets(): Plugin {
  return {
    name: 'eyvan-require-assets',
    enforce: 'pre',
    transform(code, id) {
      if (id.includes('node_modules') || !/\.tsx?$/.test(id) || !code.includes('require(')) return null
      const imports: string[] = []
      const out = code.replace(/require\((['"])([^'"]+\.(?:png|jpe?g|webp|gif))\1\)/g, (_m, _q, file) => {
        imports.push(`import __eyvanAsset${imports.length} from ${JSON.stringify(file)}`)
        return `{ uri: __eyvanAsset${imports.length - 1} }`
      })
      return imports.length ? { code: imports.join(';\n') + ';\n' + out, map: null } : null
    }
  }
}

const root = path.resolve(__dirname, '..')
const app = (p: string) => path.join(root, 'src', p)
const shim = (p: string) => path.join(__dirname, 'src', 'shims', p)
const rootModule = (p: string) => path.join(root, 'node_modules', p)

const extensions = ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js', '.jsx', '.json']

export default defineConfig(({ mode }) => ({
  plugins: [jsxInNodeModules(), requireAssets(), react({ babel: { plugins: [appFontText] } })],
  define: {
    __DEV__: JSON.stringify(mode !== 'production'),
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
    'process.env.JEST_WORKER_ID': 'undefined',
    'process.env.AZAR_TEST_DB_TAG': 'undefined',
    'process.env.EXPO_OS': '"web"'
  },
  resolve: {
    extensions,
    dedupe: ['react', 'react-dom', 'react-native-web'],
    alias: [
      { find: /^react$/, replacement: rootModule('react') },
      { find: /^react\/(.*)$/, replacement: rootModule('react') + '/$1' },
      { find: /^react-native$/, replacement: shim('react-native.ts') },
      { find: /^react-native-web$/, replacement: path.join(__dirname, 'node_modules', 'react-native-web') },
      { find: /^react-dom$/, replacement: path.join(__dirname, 'node_modules', 'react-dom') },
      { find: /^react-dom\/(.*)$/, replacement: path.join(__dirname, 'node_modules', 'react-dom') + '/$1' },
      { find: '@app', replacement: app('app') },
      { find: '@navigation', replacement: app('navigation') },
      { find: '@core', replacement: app('core') },
      { find: '@features', replacement: app('features') },
      { find: '@shared', replacement: app('shared') },
      { find: '@infrastructure', replacement: app('infrastructure') },
      { find: /^@op-engineering\/op-sqlite$/, replacement: shim('op-sqlite.ts') },
      { find: /^react-native-keychain$/, replacement: shim('keychain.ts') },
      { find: /^react-native-quick-crypto$/, replacement: shim('quick-crypto.ts') },
      { find: /^react-native-quick-base64$/, replacement: shim('quick-base64.ts') },
      { find: /^react-native-fs$/, replacement: shim('fs.ts') },
      { find: /^react-native-share$/, replacement: shim('share.ts') },
      { find: /^react-native-calendar-events$/, replacement: shim('calendar-events.ts') },
      { find: /^react-native-camera-kit$/, replacement: shim('camera-kit.tsx') },
      { find: /^@react-native-documents\/picker$/, replacement: shim('document-picker.ts') }
    ]
  },
  optimizeDeps: {
    esbuildOptions: { loader: { '.js': 'jsx' }, resolveExtensions: extensions }
  },
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 4000 },
  server: {
    port: 5190,
    fs: { allow: [root] },
    // the live azar-auth, as app.kssx.ir/api reaches it; EYVAN_API_TARGET points a local test at a local azar-auth
    proxy: { '/api': { target: process.env.EYVAN_API_TARGET || 'https://api.zarandix.ir', changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, '') } }
  }
}))
