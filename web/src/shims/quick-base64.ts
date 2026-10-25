// EYVAN web: react-native-quick-base64 on Buffer.
import { Buffer } from 'buffer'
export const toByteArray = (b64: string) => new Uint8Array(Buffer.from(b64, 'base64'))
export const fromByteArray = (data: Uint8Array) => Buffer.from(data).toString('base64')
