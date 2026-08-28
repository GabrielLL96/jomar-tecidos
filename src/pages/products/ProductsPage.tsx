import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCompositions, useProducts } from '@/features/catalog/hooks'
import { formatCompositionLabel } from '@/features/catalog/utils'
import { ProductCard } from '@/features/catalog/components/ProductCard'
import { ProductFilters } from './components/ProductFilters'
import { useSeoMeta } from '@/lib/seo'

export function ProductsPage() {
  const [searchParams] = useSearchParams()
  const categoria = searchParams.get('categoria')
  const busca = searchParams.get('busca')?.trim().toLowerCase()
  const novidades = searchParams.get('novidades') === '1'

  // Canonical sempre em /tecidos (sem query params) — filtro/busca não deve
  // gerar página indexável própria, senão pulveriza o mesmo conteúdo em N
  // URLs diferentes (faceted navigation, problema clássico de SEO).
  useSeoMeta({
    title: novidades ? 'Novidades' : 'Todos os Tecidos',
    description:
      'Catálogo completo de tecidos, enxovais e aviamentos da Jomar — algodões, linhos, sedas, poliéster e nylon, com filtro por material, cor e preço.',
    path: '/tecidos',
  })

  const { data: products } = useProducts()
  const { data: compositions = [] } = useCompositions()
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [maxPrice, setMaxPrice] = useState<number | null>(null)

  const priceBounds: [number, number] = useMemo(() => {
    if (!products?.length) return [0, 300]
    const prices = products.map((product) => product.pricePerMeter)
    return [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))]
  }, [products])

  const materials = useMemo(() => {
    if (!products) return []
    const counts = new Map<string, number>()
    for (const product of products) {
      const label = formatCompositionLabel(product.compositions, compositions)
      counts.set(label, (counts.get(label) ?? 0) + 1)
    }
    return Array.from(counts.entries()).map(([label, count]) => ({ label, count }))
  }, [products, compositions])

  const colors = useMemo(() => {
    if (!products) return []
    const hexes = new Set<string>()
    for (const product of products) {
      for (const option of product.colorOptions) hexes.add(option.hex)
    }
    return Array.from(hexes)
  }, [products])

  const filtered = useMemo(() => {
    if (!products) return []
    return products.filter((product) => {
      if (categoria && product.categorySlug !== categoria) return false
      if (novidades && product.tag !== 'Novo') return false
      if (busca && !product.name.toLowerCase().includes(busca)) return false
      if (
        selectedMaterials.length &&
        !selectedMaterials.includes(formatCompositionLabel(product.compositions, compositions))
      )
        return false
      if (
        selectedColors.length &&
        !product.colorOptions.some((option) => selectedColors.includes(option.hex))
      )
        return false
      if (maxPrice !== null && product.pricePerMeter > maxPrice) return false
      return true
    })
  }, [
    products,
    compositions,
    categoria,
    novidades,
    busca,
    selectedMaterials,
    selectedColors,
    maxPrice,
  ])

  const toggleMaterial = (label: string) =>
    setSelectedMaterials((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label],
    )

  const toggleColor = (hex: string) =>
    setSelectedColors((prev) =>
      prev.includes(hex) ? prev.filter((item) => item !== hex) : [...prev, hex],
    )

  return (
    <main className="mx-auto w-full max-w-(--breakpoint-2xl) px-6 py-10 md:px-12">
      <div className="text-text-meta mb-2 text-xs">
        <Link to="/">Início</Link> / Tecidos
      </div>
      <h1 className="text-navy-dark mb-8 font-serif text-4xl font-medium">
        Nossa coleção de tecidos
      </h1>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-[230px_1fr]">
        <ProductFilters
          materials={materials}
          selectedMaterials={selectedMaterials}
          onToggleMaterial={toggleMaterial}
          colors={colors}
          selectedColors={selectedColors}
          onToggleColor={toggleColor}
          priceBounds={priceBounds}
          maxPrice={maxPrice ?? priceBounds[1]}
          onMaxPriceChange={setMaxPrice}
        />

        <div>
          <div className="text-text-meta mb-5 flex items-center justify-between text-sm">
            <span>{filtered.length} tecidos encontrados</span>
          </div>
          {filtered.length === 0 ? (
            <p className="text-text-body text-sm">Nenhum tecido encontrado com esses filtros.</p>
          ) : (
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
