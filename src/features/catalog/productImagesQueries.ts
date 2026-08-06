import { supabase } from '@/lib/supabase'
import type { ProductImage } from './types'

const BUCKET = 'product-images'

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(new RegExp('[̀-ͯ]', 'g'), '')
    .replace(/[^a-z0-9.]+/g, '-')
}

function extractStoragePath(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`
  const index = url.indexOf(marker)
  return index === -1 ? null : url.slice(index + marker.length)
}

export async function uploadProductImage(
  productId: string,
  file: File,
  nextSortOrder: number,
): Promise<ProductImage> {
  const path = `${productId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file)
  if (uploadError) throw new Error(uploadError.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)

  const { data: inserted, error: insertError } = await supabase
    .from('product_images')
    .insert({ product_id: productId, url: data.publicUrl, sort_order: nextSortOrder })
    .select('id, url, sort_order')
    .single()
  if (insertError) throw new Error(insertError.message)

  return { id: inserted.id, url: inserted.url, sortOrder: inserted.sort_order }
}

export async function deleteProductImage(image: ProductImage): Promise<void> {
  const { error: deleteRowError } = await supabase.from('product_images').delete().eq('id', image.id)
  if (deleteRowError) throw new Error(deleteRowError.message)

  const path = extractStoragePath(image.url)
  if (path) await supabase.storage.from(BUCKET).remove([path])
}

export async function reorderProductImages(updates: { id: string; sortOrder: number }[]): Promise<void> {
  for (const update of updates) {
    const { error } = await supabase
      .from('product_images')
      .update({ sort_order: update.sortOrder })
      .eq('id', update.id)
    if (error) throw new Error(error.message)
  }
}
