import { Skeleton } from '@/components/ui/skeleton'

const PLACEHOLDER_COUNT = 5

export function CategorySkeleton() {
  return (
    <div className="mx-auto flex max-w-(--breakpoint-xl) gap-6 overflow-hidden">
      {Array.from({ length: PLACEHOLDER_COUNT }).map((_, index) => (
        <div key={index} className="w-[260px] shrink-0">
          <Skeleton className="h-[220px] rounded-sm" />
          <Skeleton className="mt-3.5 h-5 w-3/4" />
          <Skeleton className="mt-2 h-3 w-1/3" />
        </div>
      ))}
    </div>
  )
}
