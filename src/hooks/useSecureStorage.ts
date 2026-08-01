import { useCallback } from 'react'
import CryptoJS from 'crypto-js'

const STORAGE_SECRET = import.meta.env.VITE_PUBLIC_CRYPTO_KEY
const ENCRYPTION_PREFIX = 'enc:'

const encryptValue = (value: string) => {
  if (!STORAGE_SECRET) return value
  return CryptoJS.AES.encrypt(value, STORAGE_SECRET).toString()
}

const decryptValue = (value: string) => {
  if (!STORAGE_SECRET) return value
  try {
    const bytes = CryptoJS.AES.decrypt(value, STORAGE_SECRET)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    return decrypted ? decrypted : null
  } catch {
    return null
  }
}

const parseStoredValue = <T>(value: string): T | string => {
  try {
    return JSON.parse(value) as T
  } catch {
    return value
  }
}

export const useSecureStorage = () => {
  const storageAvailable =
    typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

  const getItem = useCallback(
    <T>(key: string, fallback: T | null = null): T | null => {
      if (!storageAvailable) return fallback

      const raw = window.localStorage.getItem(key)
      if (raw === null) return fallback

      const isEncrypted = raw.startsWith(ENCRYPTION_PREFIX)
      const payload = isEncrypted ? raw.slice(ENCRYPTION_PREFIX.length) : raw
      const decrypted = isEncrypted ? decryptValue(payload) : payload

      if (isEncrypted && decrypted === null) return fallback

      const candidate = decrypted ?? payload
      return parseStoredValue<T>(candidate) as T
    },
    [storageAvailable],
  )

  const setItem = useCallback(
    <T>(key: string, value: T) => {
      if (!storageAvailable) {
        console.warn(`[useSecureStorage] Storage indisponível para setItem("${key}")`)
        return
      }

      const serialized = JSON.stringify(value)
      const encrypted = encryptValue(serialized)
      const storedValue = STORAGE_SECRET ? `${ENCRYPTION_PREFIX}${encrypted}` : encrypted

      window.localStorage.setItem(key, storedValue)
    },
    [storageAvailable],
  )

  const removeItem = useCallback(
    (key: string) => {
      if (!storageAvailable) return
      window.localStorage.removeItem(key)
    },
    [storageAvailable],
  )

  const clear = useCallback(() => {
    if (!storageAvailable) return
    window.localStorage.clear()
  }, [storageAvailable])

  return { getItem, setItem, removeItem, clear }
}
