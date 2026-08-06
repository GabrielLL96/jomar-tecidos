import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  deleteProductImage,
  reorderProductImages,
  uploadProductImage,
} from '@/features/catalog/productImagesQueries'
import type { Product, ProductImage } from '@/features/catalog/types'

interface ProductImagesModalProps {
  product: Product | null
  onOpenChange: (open: boolean) => void
}

export function ProductImagesModal({ product, onOpenChange }: ProductImagesModalProps) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [images, setImages] = useState<ProductImage[]>(product?.images ?? [])
  const [isUploading, setIsUploading] = useState(false)
  const [loadedProductId, setLoadedProductId] = useState(product?.id)

  if (product?.id !== loadedProductId) {
    setLoadedProductId(product?.id)
    setImages(product?.images ?? [])
  }

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['products'] })

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!product || files.length === 0) return

    setIsUploading(true)
    try {
      let nextSortOrder = images.length ? Math.max(...images.map((i) => i.sortOrder)) + 1 : 0
      const uploaded: ProductImage[] = []
      for (const file of files) {
        uploaded.push(await uploadProductImage(product.id, file, nextSortOrder))
        nextSortOrder += 1
      }
      setImages((current) => [...current, ...uploaded])
      await invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar a imagem')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = async (image: ProductImage) => {
    try {
      await deleteProductImage(image)
      setImages((current) => current.filter((i) => i.id !== image.id))
      await invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível remover a imagem')
    }
  }

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= images.length) return

    const reordered = [...images]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved)
    const withSortOrder = reordered.map((image, i) => ({ ...image, sortOrder: i }))
    setImages(withSortOrder)

    try {
      await reorderProductImages(withSortOrder.map((image) => ({ id: image.id, sortOrder: image.sortOrder })))
      await invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível reordenar')
    }
  }

  return (
    <Dialog open={Boolean(product)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Imagens — {product?.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {images.length === 0 ? (
            <p className="text-text-body text-sm">Este produto ainda não tem imagens.</p>
          ) : (
            images.map((image, index) => (
              <div
                key={image.id}
                className="flex items-center gap-3 rounded-md border border-[#ede8de] p-2.5"
              >
                <img src={image.url} alt="" className="size-14 shrink-0 rounded-sm object-cover" />
                <span className="text-text-meta flex-1 text-xs">
                  {index === 0 ? 'Capa' : `Posição ${index + 1}`}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={index === 0}
                  onClick={() => handleMove(index, -1)}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={index === images.length - 1}
                  onClick={() => handleMove(index, 1)}
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button type="button" variant="outline" size="icon" onClick={() => handleRemove(image)}>
                  <X className="size-4" />
                </Button>
              </div>
            ))
          )}

          <Button
            type="button"
            variant="outline"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? <Loader2 className="size-4 animate-spin" /> : 'Adicionar imagens'}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
        </div>

        <DialogFooter className="border-t border-[#ede8de] pt-5">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
