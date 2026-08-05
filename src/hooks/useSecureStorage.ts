import { useCallback } from 'react'
import { decryptFromStorage, encryptForStorage } from '@/lib/secureStorage'

export const useSecureStorage = () => {
  const storageAvailable =
    typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

  const getItem = useCallback(
    <T>(key: string, fallback: T | null = null): T | null => {
      if (!storageAvailable) return fallback

      const raw = window.localStorage.getItem(key)
      if (raw === null) return fallback

      const result = decryptFromStorage<T>(raw)
      return result.ok ? (result.value as T) : fallback
    },
    [storageAvailable],
  )

  const setItem = useCallback(
    <T>(key: string, value: T) => {
      if (!storageAvailable) {
        console.warn(`[useSecureStorage] Storage indisponível para setItem("${key}")`)
        return
      }

      window.localStorage.setItem(key, encryptForStorage(value))
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
