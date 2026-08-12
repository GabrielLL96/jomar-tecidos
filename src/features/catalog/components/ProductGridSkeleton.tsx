import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const PLACEHOLDER_COUNT = 4

interface ProductGridSkeletonProps {
  /** Seção com fundo escuro (ex.: "Mais vendidos") — troca o tom do pulse pra ficar visível. */
  variant?: 'light' | 'dark'
}

export function ProductGridSkeleton({ variant = 'light' }: ProductGridSkeletonProps) {
  const pulseClassName = variant === 'dark' ? 'bg-white/10' : undefined

  return (
    <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
      {Array.from({ length: PLACEHOLDER_COUNT }).map((_, index) => (
        <div key={index}>
          <Skeleton className={cn('h-[190px] rounded-sm md:h-[210px]', pulseClassName)} />
          <Skeleton className={cn('mt-3 h-4 w-3/4', pulseClassName)} />
          <Skeleton className={cn('mt-2 h-3 w-1/2', pulseClassName)} />
          <Skeleton className={cn('mt-2 h-4 w-1/3', pulseClassName)} />
        </div>
      ))}
    </div>
  )
}
