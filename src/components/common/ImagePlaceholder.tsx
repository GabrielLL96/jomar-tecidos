import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ImagePlaceholderProps {
  colors: readonly [string, string]
  label?: string
  className?: string
  children?: ReactNode
}

export function ImagePlaceholder({ colors, label, className, children }: ImagePlaceholderProps) {
  return (
    <div
      className={cn('relative flex items-end justify-start', className)}
      style={{
        backgroundImage: `repeating-linear-gradient(115deg, ${colors[0]} 0 14px, ${colors[1]} 14px 28px)`,
      }}
    >
      {label && (
        <span className="bg-navy-dark/85 m-4 rounded-sm px-2 py-1 font-mono text-[10px] text-white">
          {label}
        </span>
      )}
      {children}
    </div>
  )
}
