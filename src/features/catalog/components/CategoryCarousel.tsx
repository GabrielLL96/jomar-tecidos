import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ImagePlaceholder } from '@/components/common/ImagePlaceholder'
import type { Category } from '../types'

const SCROLL_STEP = 284

interface CategoryCarouselProps {
  categories: Category[]
}

export function CategoryCarousel({ categories }: CategoryCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canScroll, setCanScroll] = useState(false)

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const checkOverflow = () => setCanScroll(el.scrollWidth > el.clientWidth + 1)
    checkOverflow()

    const observer = new ResizeObserver(checkOverflow)
    observer.observe(el)
    return () => observer.disconnect()
  }, [categories.length])

  const scrollBy = (delta: number) => scrollerRef.current?.scrollBy({ left: delta, behavior: 'smooth' })

  return (
    <div className="relative mx-auto max-w-(--breakpoint-xl)">
      <div
        ref={scrollerRef}
        className="flex gap-6 overflow-x-auto pb-3 [scroll-snap-type:x_mandatory] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((category) => (
          <Link
            key={category.slug}
            to={`/tecidos?categoria=${category.slug}`}
            className="w-[260px] shrink-0 [scroll-snap-align:start]"
          >
            <ImagePlaceholder colors={category.colors} label={category.tag} className="h-[220px] rounded-sm" />
            <div className="mt-3.5 font-serif text-[19px] text-foreground">{category.name}</div>
            <div className="text-text-meta mt-0.5 text-[12.5px]">{category.count} tecidos</div>
          </Link>
        ))}
      </div>
      {canScroll && (
        <>
          <button
            type="button"
            aria-label="Categoria anterior"
            onClick={() => scrollBy(-SCROLL_STEP)}
            className="border-border text-navy absolute top-[96px] -left-5 flex size-11 items-center justify-center rounded-full border bg-white shadow-md"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Próxima categoria"
            onClick={() => scrollBy(SCROLL_STEP)}
            className="border-border text-navy absolute top-[96px] -right-5 flex size-11 items-center justify-center rounded-full border bg-white shadow-md"
          >
            <ChevronRight className="size-4" />
          </button>
        </>
      )}
    </div>
  )
}
