import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ImagePlaceholderProps {
  colors: readonly [string, string]
  src?: string | null
  alt?: string
  label?: string
  className?: string
  children?: ReactNode
}

export function ImagePlaceholder({
  colors,
  src,
  alt = '',
  label,
  className,
  children,
}: ImagePlaceholderProps) {
  return (
    <div
      className={cn('relative flex items-end justify-start overflow-hidden', className)}
      style={{
        backgroundImage: `repeating-linear-gradient(115deg, ${colors[0]} 0 14px, ${colors[1]} 14px 28px)`,
      }}
    >
      {src && (
        <img src={src} alt={alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      )}
      {label && (
        <span className="bg-navy-dark/85 relative z-10 m-4 rounded-sm px-2 py-1 font-mono text-xs text-white">
          {label}
        </span>
      )}
      {children}
    </div>
  )
}
