import { useEffect } from 'react'

// SPA sem SSR (ADR-014) — isso ajuda o Google (que executa JS antes de
// indexar) mas NÃO ajuda crawler de rede social (WhatsApp/Facebook/Twitter
// não rodam JS, só leem o HTML inicial). Preview de link em WhatsApp
// continua genérico até existir injeção de OG tag no servidor (Cloudflare
// Pages Function, camada separada) — ver análise de SEO.
const SITE_URL = 'https://jomartecidos.com.br'
const SITE_NAME = 'Jomar Tecidos e Enxovais'
const DEFAULT_OG_IMAGE = `${SITE_URL}/logo.png`

interface SeoMetaInput {
  title: string
  description: string
  path: string
  image?: string
  type?: 'website' | 'product' | 'article'
  noindex?: boolean
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

// Efeito legítimo com useEffect (não é "ajustar state durante o render") —
// está sincronizando um sistema externo real (document.title, <head> do
// DOM), mesma categoria já documentada em skills/reactjs.md.
export function useSeoMeta({
  title,
  description,
  path,
  image,
  type = 'website',
  noindex = false,
}: SeoMetaInput) {
  useEffect(() => {
    const fullTitle = `${title} | ${SITE_NAME}`
    const url = `${SITE_URL}${path}`
    const ogImage = image ?? DEFAULT_OG_IMAGE

    document.title = fullTitle
    upsertMeta('name', 'description', description)
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
    upsertLink('canonical', url)

    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:type', type)
    upsertMeta('property', 'og:url', url)
    upsertMeta('property', 'og:image', ogImage)
    upsertMeta('property', 'og:site_name', SITE_NAME)
    upsertMeta('property', 'og:locale', 'pt_BR')

    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', fullTitle)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', ogImage)
  }, [title, description, path, image, type, noindex])
}

const PRODUCT_JSON_LD_SCRIPT_ID = 'product-json-ld'

export interface ProductJsonLdInput {
  name: string
  description: string
  sku: string
  slug: string
  image: string[]
  priceBRL: number
  inStock: boolean
  ratingValue?: number
  reviewCount?: number
}

// Structured data pra rich snippet (preço/disponibilidade/estrelas) no
// resultado de busca do Google — só entra aggregateRating quando existe
// review de verdade (Google penaliza/ignora nota fake ou com reviewCount 0).
export function useProductJsonLd(input: ProductJsonLdInput | null) {
  // Dep é o conteúdo serializado, não a referência do objeto — o caller
  // (ProductDetailPage) constrói um literal novo a cada render; sem isso o
  // efeito rodaria (remove+recria a <script>) em todo render, não só quando
  // o produto muda de verdade.
  const inputKey = input ? JSON.stringify(input) : null

  useEffect(() => {
    const existing = document.getElementById(PRODUCT_JSON_LD_SCRIPT_ID)
    if (existing) existing.remove()
    if (!input) return

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: input.name,
      description: input.description,
      sku: input.sku,
      image: input.image,
      url: `${SITE_URL}/tecidos/${input.slug}`,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'BRL',
        price: input.priceBRL.toFixed(2),
        availability: input.inStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        url: `${SITE_URL}/tecidos/${input.slug}`,
      },
      ...(input.ratingValue && input.reviewCount
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: input.ratingValue.toFixed(1),
              reviewCount: input.reviewCount,
            },
          }
        : {}),
    }

    const script = document.createElement('script')
    script.id = PRODUCT_JSON_LD_SCRIPT_ID
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(jsonLd)
    document.head.appendChild(script)

    return () => script.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- inputKey já é a serialização de `input`, incluir os dois seria redundante
  }, [inputKey])
}
