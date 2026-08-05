import CryptoJS from 'crypto-js'

const STORAGE_SECRET = import.meta.env.VITE_PUBLIC_CRYPTO_KEY
export const ENCRYPTION_PREFIX = 'enc:'

export const encryptValue = (value: string) => {
  if (!STORAGE_SECRET) return value
  return CryptoJS.AES.encrypt(value, STORAGE_SECRET).toString()
}

export const decryptValue = (value: string) => {
  if (!STORAGE_SECRET) return value
  try {
    const bytes = CryptoJS.AES.decrypt(value, STORAGE_SECRET)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    return decrypted ? decrypted : null
  } catch {
    return null
  }
}

export const parseStoredValue = <T>(value: string): T | string => {
  try {
    return JSON.parse(value) as T
  } catch {
    return value
  }
}

export function encryptForStorage<T>(value: T): string {
  const serialized = JSON.stringify(value)
  const encrypted = encryptValue(serialized)
  return STORAGE_SECRET ? `${ENCRYPTION_PREFIX}${encrypted}` : encrypted
}

export type DecryptResult<T> = { ok: true; value: T | string } | { ok: false }

export function decryptFromStorage<T>(raw: string): DecryptResult<T> {
  const isEncrypted = raw.startsWith(ENCRYPTION_PREFIX)
  const payload = isEncrypted ? raw.slice(ENCRYPTION_PREFIX.length) : raw
  const decrypted = isEncrypted ? decryptValue(payload) : payload

  if (isEncrypted && decrypted === null) return { ok: false }

  const candidate = decrypted ?? payload
  return { ok: true, value: parseStoredValue<T>(candidate) }
}
