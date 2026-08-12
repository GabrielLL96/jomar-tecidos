import { useState } from 'react'
import { ImageUp, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { resizeImageFile } from '@/lib/image-compression'
import { supabase } from '@/lib/supabase'
import { SITE_IMAGE_MAX_WIDTH } from '@/lib/constants'
import { cn, extractStoragePath } from '@/lib/utils'

interface ImageUploadFieldProps {
  bucket: 'product-images' | 'site-images'
  pathPrefix: string
  value?: string | null
  onChange: (url: string) => void
  disabled?: boolean
  className?: string
}

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(new RegExp('[̀-ͯ]', 'g'), '')
    .replace(/[^a-z0-9.]+/g, '-')
}

export function ImageUploadField({
  bucket,
  pathPrefix,
  value,
  onChange,
  disabled,
  className,
}: ImageUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setIsUploading(true)
    try {
      const resized = await resizeImageFile(file, SITE_IMAGE_MAX_WIDTH)
      const path = `${pathPrefix}/${crypto.randomUUID()}-${sanitizeFileName(resized.name)}`
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, resized, { upsert: true, cacheControl: '31536000' })
      if (error) throw new Error(error.message)

      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      const previousValue = value
      onChange(data.publicUrl)

      // best-effort: a troca já está confirmada (onChange já rodou), não bloquear
      // nem reportar erro ao usuário se a imagem antiga não puder ser removida.
      if (previousValue) {
        const oldPath = extractStoragePath(bucket, previousValue)
        if (oldPath) await supabase.storage.from(bucket).remove([oldPath])
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar a imagem')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!value) return
    setIsRemoving(true)
    try {
      const path = extractStoragePath(bucket, value)
      if (path) {
        const { error } = await supabase.storage.from(bucket).remove([path])
        if (error) throw new Error(error.message)
      }
      onChange('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível remover a imagem')
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {value ? (
        <div className="relative size-16 shrink-0 overflow-hidden rounded-sm border border-[#e4ddd0]">
          <img src={value} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="flex size-16 shrink-0 items-center justify-center rounded-sm border border-dashed border-[#d8d0c0] text-[#a39a8c]">
          <ImageUp className="size-5" />
        </div>
      )}
      <div className="flex gap-2">
        <label
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'cursor-pointer',
            (disabled || isUploading || isRemoving) && 'pointer-events-none opacity-50',
          )}
        >
          {isUploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : value ? (
            'Trocar'
          ) : (
            'Enviar imagem'
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={disabled || isUploading || isRemoving}
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
        {value && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isUploading || isRemoving}
            onClick={handleRemove}
          >
            {isRemoving ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
          </Button>
        )}
      </div>
    </div>
  )
}
