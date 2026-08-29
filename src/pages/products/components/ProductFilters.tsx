import { formatPriceBRL } from '@/lib/format'
import { cn } from '@/lib/utils'

interface MaterialFilter {
  label: string
  count: number
}

interface ColorFilter {
  hex: string
  label: string
}

interface ProductFiltersProps {
  materials: MaterialFilter[]
  selectedMaterials: string[]
  onToggleMaterial: (label: string) => void
  colors: ColorFilter[]
  selectedColors: string[]
  onToggleColor: (hex: string) => void
  priceBounds: [number, number]
  maxPrice: number
  onMaxPriceChange: (value: number) => void
}

export function ProductFilters({
  materials,
  selectedMaterials,
  onToggleMaterial,
  colors,
  selectedColors,
  onToggleColor,
  priceBounds,
  maxPrice,
  onMaxPriceChange,
}: ProductFiltersProps) {
  return (
    <aside className="flex flex-col gap-7">
      <div>
        <div className="text-navy-dark mb-3 text-xs font-semibold tracking-[0.06em] uppercase">
          Material
        </div>
        {materials.map((material) => (
          <label
            key={material.label}
            className="text-text-body-dark mb-2.5 flex items-center gap-2 text-sm"
          >
            <input
              type="checkbox"
              checked={selectedMaterials.includes(material.label)}
              onChange={() => onToggleMaterial(material.label)}
            />
            {material.label} <span className="text-[#a39a8c]">({material.count})</span>
          </label>
        ))}
      </div>

      <div>
        <div className="text-navy-dark mb-3 text-xs font-semibold tracking-[0.06em] uppercase">
          Cor
        </div>
        <div className="flex flex-wrap gap-2">
          {colors.map(({ hex, label }) => (
            <button
              key={hex}
              type="button"
              aria-label={`Filtrar pela cor ${label}`}
              aria-pressed={selectedColors.includes(hex)}
              onClick={() => onToggleColor(hex)}
              style={{ backgroundColor: hex }}
              className={cn(
                'border-input size-[26px] rounded-full border',
                selectedColors.includes(hex) && 'ring-navy ring-2 ring-offset-1',
              )}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="text-navy-dark mb-3 text-xs font-semibold tracking-[0.06em] uppercase">
          Preço por metro
        </div>
        <input
          type="range"
          min={priceBounds[0]}
          max={priceBounds[1]}
          value={maxPrice}
          onChange={(event) => onMaxPriceChange(Number(event.target.value))}
          className="w-full"
        />
        <div className="text-text-meta mt-1 flex justify-between text-xs">
          <span>{formatPriceBRL(priceBounds[0])}</span>
          <span>{formatPriceBRL(maxPrice)}</span>
        </div>
      </div>
    </aside>
  )
}
