import { Loader2 } from 'lucide-react'

export function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <Loader2 className="text-navy-dark size-8 animate-spin" />
    </div>
  )
}
