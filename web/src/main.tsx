/**
 * EYVAN web entry (#5183): the phone app's own App, rendered by react-native-web at app.kssx.ir.
 * Before the first render: Buffer for the shared code, the SQLite engine (op-sqlite shim), and the #5199 guards.
 */
import { Buffer } from 'buffer'
;(globalThis as { Buffer?: typeof Buffer }).Buffer ??= Buffer

import { AppRegistry } from 'react-native'
import { initSqlite } from './shims/op-sqlite'
import { initFs } from './shims/fs'
import { installGuards } from './guards'
import { registerServiceWorker } from './serviceWorker'
import { installDevFetchGuard } from './devFetchGuard'
import { showInstallGuide } from './installGuide'

async function start() {
  if (import.meta.env.DEV) installDevFetchGuard()
  installGuards()
  registerServiceWorker()
  const root = document.getElementById('root') as HTMLElement
  if (showInstallGuide(root, () => void startApp(root))) return
  await startApp(root)
}

async function startApp(root: HTMLElement) {
  await Promise.all([initSqlite(), initFs()])
  const { App } = await import('@app/App')
  AppRegistry.registerComponent('EYVAN', () => App)
  AppRegistry.runApplication('EYVAN', { rootTag: root })
}

void start()
