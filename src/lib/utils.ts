import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Extrai o path relativo de uma public URL do Supabase Storage, dado o nome do bucket. */
export function extractStoragePath(bucket: string, url: string): string | null {
  const marker = `/object/public/${bucket}/`
  const index = url.indexOf(marker)
  return index === -1 ? null : url.slice(index + marker.length)
}
