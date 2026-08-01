import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ImagePlaceholder } from '@/components/common/ImagePlaceholder'
import { Button } from '@/components/ui/button'
import { CategoryCarousel } from '@/features/catalog/components/CategoryCarousel'
import { ProductCard } from '@/features/catalog/components/ProductCard'
import { useCategories, useProducts } from '@/features/catalog/hooks'

export function Home() {
  const { data: categories } = useCategories()
  const { data: products } = useProducts()
  const featured = products?.slice(0, 4) ?? []

  return (
    <main>
      <section className="grid grid-cols-1 overflow-hidden md:grid-cols-2 md:min-h-[560px]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="order-2 flex flex-col justify-center gap-6 px-8 py-16 md:order-1 md:px-16"
        >
          <span className="text-brand-red text-[11px] font-semibold tracking-[0.18em] uppercase">
            Tradição têxtil mineira
          </span>
          <h1 className="text-navy-dark font-serif text-4xl leading-[1.05] font-medium md:text-[56px]">
            Tecidos nobres para quem tece histórias.
          </h1>
          <p className="text-text-body max-w-[480px] text-base leading-relaxed">
            Uma curadoria de linhos, algodões, sedas e aviamentos premium — da vitrine física ao seu
            ateliê, com o mesmo cuidado artesanal de sempre.
          </p>
          <div className="mt-2">
            <Button asChild size="lg" className="h-auto rounded-sm px-8 py-4 text-sm">
              <Link to="/tecidos">Ver coleção</Link>
            </Button>
          </div>
        </motion.div>
        <ImagePlaceholder
          colors={['#e9e2d2', '#ded4bb']}
          label="foto — rolo de linho na vitrine"
          className="order-1 h-64 w-full p-7 md:order-2 md:h-full"
        />
      </section>

      <section className="px-6 py-18 text-center md:px-12">
        <div className="text-text-meta mb-2.5 text-[11px] font-semibold tracking-[0.18em] uppercase">
          Categorias
        </div>
        <h2 className="text-navy-dark mb-10 font-serif text-3xl font-medium">Explore por material</h2>
        {categories && <CategoryCarousel categories={categories} />}
      </section>

      <section className="bg-navy-dark px-6 py-20 text-white md:px-12">
        <div className="mx-auto max-w-(--breakpoint-xl)">
          <div className="mb-10 flex items-baseline justify-between">
            <h2 className="font-serif text-3xl font-medium">Destaques da coleção</h2>
            <Link to="/tecidos" className="text-[13.5px] text-[#e8c9a3]">
              Ver todos os tecidos →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} variant="dark" />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-(--breakpoint-xl) grid-cols-1 items-center gap-14 px-6 py-18 md:grid-cols-2 md:px-12">
        <ImagePlaceholder colors={['#f0e6d4', '#e3d5b8']} className="h-80 rounded-sm" />
        <div>
          <div className="text-brand-red mb-3 text-[11px] font-semibold tracking-[0.18em] uppercase">
            Sob medida
          </div>
          <h2 className="text-navy-dark mb-4 font-serif text-[30px] font-medium">
            Enxovais e aviamentos para todo projeto
          </h2>
          <p className="text-text-body mb-5 text-[15px] leading-relaxed">
            Da linha de cama, mesa e banho aos aviamentos de costura — botões, zíperes, rendas e vieses
            selecionados para durar.
          </p>
          <Link to="/tecidos" className="text-navy border-navy border-b pb-0.5 text-sm font-semibold">
            Explorar enxovais
          </Link>
        </div>
      </section>
    </main>
  )
}
