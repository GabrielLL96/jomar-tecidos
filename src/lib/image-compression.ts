/**
 * Redimensiona (sem upscale) e recomprime uma imagem pra WebP via canvas nativo do browser,
 * antes do upload pro Supabase Storage — evita depender da Image Transformation API (custo por
 * transformação) e reduz o peso de fotos de banco de imagens enviadas sem otimização.
 */
export async function resizeImageFile(file: File, maxWidth: number, quality = 0.8): Promise<File> {
  const bitmap = await createImageBitmap(file)

  const scale = Math.min(1, maxWidth / bitmap.width)
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível processar a imagem')

  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', quality),
  )
  if (!blob) throw new Error('Não foi possível comprimir a imagem')

  const nameWithoutExtension = file.name.replace(/\.[^.]+$/, '')
  return new File([blob], `${nameWithoutExtension}.webp`, { type: 'image/webp' })
}
