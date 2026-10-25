// EYVAN web: react-native-keychain → sealed values in IndexedDB (idb.ts).
import { idb, seal, unseal } from './idb'

const at = (service?: string) => `keychain:${service ?? 'default'}`
const text = new TextEncoder()
const back = new TextDecoder()

export async function getGenericPassword(options?: { service?: string }) {
  const sealed = await idb.get<Uint8Array>(at(options?.service))
  if (!sealed) return false as const
  try {
    const value = JSON.parse(back.decode(await unseal(sealed))) as { username: string; password: string }
    return { service: options?.service ?? 'default', storage: 'web', ...value }
  } catch {
    return false as const
  }
}

export async function setGenericPassword(username: string, password: string, options?: { service?: string }) {
  await idb.set(at(options?.service), await seal(text.encode(JSON.stringify({ username, password }))))
  return { service: options?.service ?? 'default', storage: 'web' }
}

export async function resetGenericPassword(options?: { service?: string }) {
  await idb.delete(at(options?.service))
  return true
}
