import { decryptFromStorage, encryptForStorage } from '@/lib/secureStorage'

const CHUNK_SIZE = 3000
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30

function cookieAttributes(maxAgeSeconds: number) {
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''
  return `; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`
}

function readAllCookies(): Record<string, string> {
  if (typeof document === 'undefined' || !document.cookie) return {}
  return document.cookie.split('; ').reduce<Record<string, string>>((acc, part) => {
    const separatorIndex = part.indexOf('=')
    if (separatorIndex === -1) return acc
    const key = decodeURIComponent(part.slice(0, separatorIndex))
    const value = decodeURIComponent(part.slice(separatorIndex + 1))
    acc[key] = value
    return acc
  }, {})
}

function countChunks(cookies: Record<string, string>, key: string) {
  let count = 0
  while (`${key}.${count}` in cookies) count += 1
  return count
}

function clearChunks(key: string) {
  const cookies = readAllCookies()
  let index = 0
  while (`${key}.${index}` in cookies) {
    document.cookie = `${encodeURIComponent(`${key}.${index}`)}=${cookieAttributes(0)}`
    index += 1
  }
}

/**
 * Storage adapter para o cliente Supabase Auth: guarda a sessão em cookies
 * criptografados (AES) em vez do localStorage puro padrão, seguindo a mesma
 * regra do useSecureStorage. Sessões maiores que CHUNK_SIZE são divididas em
 * cookies `key.0`, `key.1`... para não estourar o limite de ~4KB por cookie.
 */
export const secureCookieStorage = {
  getItem(key: string): string | null {
    const cookies = readAllCookies()
    const chunkCount = countChunks(cookies, key)
    const raw = chunkCount > 0
      ? Array.from({ length: chunkCount }, (_, i) => cookies[`${key}.${i}`]).join('')
      : cookies[key]

    if (raw === undefined) return null

    const result = decryptFromStorage<string>(raw)
    if (!result.ok) return null
    return typeof result.value === 'string' ? result.value : String(result.value)
  },

  setItem(key: string, value: string): void {
    clearChunks(key)
    document.cookie = `${encodeURIComponent(key)}=${cookieAttributes(0)}`

    const encoded = encryptForStorage(value)
    if (encoded.length <= CHUNK_SIZE) {
      document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(encoded)}${cookieAttributes(MAX_AGE_SECONDS)}`
      return
    }

    for (let i = 0, offset = 0; offset < encoded.length; i += 1, offset += CHUNK_SIZE) {
      const chunk = encoded.slice(offset, offset + CHUNK_SIZE)
      document.cookie = `${encodeURIComponent(`${key}.${i}`)}=${encodeURIComponent(chunk)}${cookieAttributes(MAX_AGE_SECONDS)}`
    }
  },

  removeItem(key: string): void {
    document.cookie = `${encodeURIComponent(key)}=${cookieAttributes(0)}`
    clearChunks(key)
  },
}
