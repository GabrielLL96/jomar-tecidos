import { useState, type MouseEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const ZOOM_SCALE = 2.2

interface ImagePlaceholderProps {
  colors: readonly [string, string]
  src?: string | null
  alt?: string
  label?: string
  className?: string
  children?: ReactNode
  /** Zoom + pan seguindo o mouse ao passar por cima — usado na imagem principal da PDP. */
  zoomOnHover?: boolean
}

export function ImagePlaceholder({
  colors,
  src,
  alt = '',
  label,
  className,
  children,
  zoomOnHover = false,
}: ImagePlaceholderProps) {
  const [origin, setOrigin] = useState({ x: 50, y: 50 })
  const [isZooming, setIsZooming] = useState(false)

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setOrigin({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    })
  }

  return (
    <div
      className={cn(
        'relative flex items-end justify-start overflow-hidden',
        zoomOnHover && src && 'cursor-zoom-in',
        className,
      )}
      style={{
        backgroundImage: `repeating-linear-gradient(115deg, ${colors[0]} 0 14px, ${colors[1]} 14px 28px)`,
      }}
      onMouseEnter={zoomOnHover ? () => setIsZooming(true) : undefined}
      onMouseLeave={zoomOnHover ? () => setIsZooming(false) : undefined}
      onMouseMove={zoomOnHover ? handleMouseMove : undefined}
    >
      {src && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={cn(
            'absolute inset-0 h-full w-full object-cover',
            zoomOnHover && 'transition-transform duration-500 ease-out',
          )}
          style={
            zoomOnHover
              ? {
                  transformOrigin: `${origin.x}% ${origin.y}%`,
                  transform: isZooming ? `scale(${ZOOM_SCALE})` : 'scale(1)',
                }
              : undefined
          }
        />
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
