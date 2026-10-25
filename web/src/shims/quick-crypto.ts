// EYVAN web: the parts of react-native-quick-crypto the app uses, on browser crypto + @noble/ciphers + hash-wasm.
import { Buffer } from 'buffer'
import { gcm } from '@noble/ciphers/aes'
import { argon2id } from 'hash-wasm'

export { Buffer }

export function randomBytes(length: number): Buffer {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(length)))
}

export function randomUUID(): string {
  return crypto.randomUUID()
}

const bytes = (data: Uint8Array | ArrayBuffer | string): Uint8Array =>
  typeof data === 'string' ? Buffer.from(data) : data instanceof ArrayBuffer ? new Uint8Array(data) : data

/** AES-256-GCM in one go: update() collects, final() seals or opens (the sizes here are small). */
class Gcm {
  private parts: Uint8Array[] = []
  private aad?: Uint8Array
  private tag?: Uint8Array
  private sealedTag?: Uint8Array
  constructor(
    private readonly sealing: boolean,
    private readonly key: Uint8Array,
    private readonly iv: Uint8Array
  ) {}
  setAAD(aad: Uint8Array) {
    this.aad = bytes(aad)
    return this
  }
  setAuthTag(tag: Uint8Array) {
    this.tag = bytes(tag)
    return this
  }
  update(data: Uint8Array | string) {
    this.parts.push(bytes(data))
    return Buffer.alloc(0)
  }
  final() {
    const input = Buffer.concat(this.parts)
    const cipher = gcm(bytes(this.key), bytes(this.iv), this.aad)
    if (this.sealing) {
      const out = cipher.encrypt(input)
      this.sealedTag = out.subarray(out.length - 16)
      return Buffer.from(out.subarray(0, out.length - 16))
    }
    if (!this.tag) throw new Error('auth tag missing')
    return Buffer.from(cipher.decrypt(Buffer.concat([input, this.tag])))
  }
  getAuthTag() {
    if (!this.sealedTag) throw new Error('call final() first')
    return Buffer.from(this.sealedTag)
  }
}

function checkAlgorithm(algorithm: string) {
  if (algorithm !== 'aes-256-gcm') throw new Error(`${algorithm} is not available on the web`)
}

export function createCipheriv(algorithm: string, key: Uint8Array, iv: Uint8Array) {
  checkAlgorithm(algorithm)
  return new Gcm(true, key, iv)
}

export function createDecipheriv(algorithm: string, key: Uint8Array, iv: Uint8Array) {
  checkAlgorithm(algorithm)
  return new Gcm(false, key, iv)
}

type Argon2Params = {
  message: string | Uint8Array
  nonce: Uint8Array
  parallelism: number
  tagLength: number
  memory: number
  passes: number
  version?: number
}

export function argon2(_kind: 'argon2id', params: Argon2Params, done: (error: Error | null, result: Buffer) => void) {
  argon2id({
    password: params.message,
    salt: params.nonce,
    parallelism: params.parallelism,
    iterations: params.passes,
    memorySize: params.memory,
    hashLength: params.tagLength,
    outputType: 'binary'
  }).then(
    (result) => done(null, Buffer.from(result)),
    (error: Error) => done(error, Buffer.alloc(0))
  )
}

export default { Buffer, randomBytes, randomUUID, createCipheriv, createDecipheriv, argon2 }
