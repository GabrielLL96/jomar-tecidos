import { useRef, useState } from 'react'
import { ImageUp, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface ImageUploadFieldProps {
  bucket: 'product-images' | 'site-images'
  pathPrefix: string
  value?: string | null
  onChange: (url: string) => void
  onRemove?: () => void
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
  onRemove,
  disabled,
  className,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setIsUploading(true)
    try {
      const path = `${pathPrefix}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
      if (error) throw new Error(error.message)

      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      onChange(data.publicUrl)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar a imagem')
    } finally {
      setIsUploading(false)
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? <Loader2 className="size-4 animate-spin" /> : value ? 'Trocar' : 'Enviar imagem'}
        </Button>
        {value && onRemove && (
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onRemove}>
            <X className="size-4" />
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
