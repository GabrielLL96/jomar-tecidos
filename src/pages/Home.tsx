import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ImagePlaceholder } from '@/components/common/ImagePlaceholder'
import { Button } from '@/components/ui/button'
import { CategoryCarousel } from '@/features/catalog/components/CategoryCarousel'
import { CategorySkeleton } from '@/features/catalog/components/CategorySkeleton'
import { ProductCard } from '@/features/catalog/components/ProductCard'
import { ProductGridSkeleton } from '@/features/catalog/components/ProductGridSkeleton'
import { useCategories, useProducts } from '@/features/catalog/hooks'
import { useSiteSettings } from '@/features/site-settings/hooks'

export function Home() {
  const { data: categories, isLoading: isLoadingCategories } = useCategories()
  const { data: products, isLoading: isLoadingProducts } = useProducts()
  const { data: settings } = useSiteSettings()

  const categoriesWithImages = categories?.map((category) => ({
    ...category,
    imageUrl: settings[`category_image_${category.id}` as keyof typeof settings] || undefined,
  }))

  const bestsellers = (products ?? []).filter((product) => product.isBestseller).slice(0, 4)
  const newProducts = (products ?? []).filter((product) => product.tag === 'Novo').slice(0, 4)

  return (
    <main>
      <section className="grid grid-cols-1 overflow-hidden md:grid-cols-2 md:min-h-[560px]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="order-2 flex flex-col justify-center gap-6 px-8 py-16 md:order-1 md:px-16"
        >
          <span className="text-brand-red text-xs font-semibold tracking-[0.18em] uppercase">
            {settings.home_hero_eyebrow}
          </span>
          <h1 className="text-navy-dark font-serif text-4xl leading-[1.05] font-medium md:text-5xl">
            {settings.home_hero_title}
          </h1>
          <p className="text-text-body max-w-[660px] text-2xl leading-relaxed">
            {settings.home_hero_subtitle}
          </p>
          <div className="mt-2">
            <Button asChild size="lg" className="h-auto rounded-sm px-8 py-4 text-sm">
              <Link to="/tecidos">{settings.home_hero_cta_label}</Link>
            </Button>
          </div>
        </motion.div>
        <ImagePlaceholder
          colors={['#e9e2d2', '#ded4bb']}
          src={settings.home_hero_image_url || undefined}
          label={settings.home_hero_image_url ? undefined : 'foto — rolo de linho na vitrine'}
          className="order-1 h-64 w-full p-7 md:order-2 md:h-full"
          priority
        />
      </section>

      <section className="px-6 py-18 text-center md:px-12">
        <div className="text-text-meta mb-2.5 text-xs font-semibold tracking-[0.18em] uppercase">
          Categorias
        </div>
        <h2 className="text-navy-dark mb-10 font-serif text-3xl font-medium">
          Explore por material
        </h2>
        {isLoadingCategories ? (
          <CategorySkeleton />
        ) : (
          categoriesWithImages && <CategoryCarousel categories={categoriesWithImages} />
        )}
      </section>

      {(isLoadingProducts || bestsellers.length > 0) && (
        <section className="bg-navy-dark px-6 py-20 text-white md:px-12">
          <div className="mx-auto max-w-(--breakpoint-xl)">
            <div className="mb-10 flex items-baseline justify-between">
              <h2 className="font-serif text-3xl font-medium">Mais vendidos</h2>
              <Link to="/tecidos" className="text-sm text-[#e8c9a3]">
                Ver todos os tecidos →
              </Link>
            </div>
            {isLoadingProducts ? (
              <ProductGridSkeleton variant="dark" />
            ) : (
              <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
                {bestsellers.map((product) => (
                  <ProductCard key={product.id} product={product} variant="dark" />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {(isLoadingProducts || newProducts.length > 0) && (
        <section className="px-6 py-20 md:px-12">
          <div className="mx-auto max-w-(--breakpoint-xl)">
            <div className="mb-10 flex items-baseline justify-between">
              <h2 className="text-navy-dark font-serif text-3xl font-medium">Novidades</h2>
              <Link to="/tecidos" className="text-navy text-sm">
                Ver todos os tecidos →
              </Link>
            </div>
            {isLoadingProducts ? (
              <ProductGridSkeleton />
            ) : (
              <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
                {newProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="mx-auto grid max-w-(--breakpoint-xl) grid-cols-1 items-center gap-14 px-6 py-18 md:grid-cols-2 md:px-12">
        <Link to="/tecidos" aria-label={settings.home_banner2_cta_label}>
          <ImagePlaceholder
            colors={['#f0e6d4', '#e3d5b8']}
            src={settings.home_banner2_image_url || undefined}
            className="h-80 rounded-sm"
          />
        </Link>
        <div>
          <div className="text-brand-red mb-3 text-xs font-semibold tracking-[0.18em] uppercase">
            {settings.home_banner2_eyebrow}
          </div>
          <h2 className="text-navy-dark mb-4 font-serif text-3xl font-medium">
            {settings.home_banner2_title}
          </h2>
          <p className="text-text-body mb-5 text-base leading-relaxed">
            {settings.home_banner2_subtitle}
          </p>
          <Link
            to="/tecidos"
            className="text-navy border-navy border-b pb-0.5 text-sm font-semibold"
          >
            {settings.home_banner2_cta_label}
          </Link>
        </div>
      </section>
    </main>
  )
}
