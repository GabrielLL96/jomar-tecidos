// Cloudflare Pages Function em /tecidos/:slug — intercepta a rota ANTES do
// fallback de SPA, busca o produto real no Supabase e reescreve as meta
// tags OG/Twitter/title/description no HTML servido.
//
// Por quê: o site é SPA sem SSR (ADR-014) — useSeoMeta (src/lib/seo.ts) já
// resolve isso client-side, mas só ajuda quem executa JS (Google). Crawler
// de WhatsApp/Facebook/Twitter lê só o HTML da primeira resposta, sem rodar
// JS — sem isso, todo link de produto compartilhado mostra preview
// genérico (sem foto/preço/nome). HTMLRewriter (nativo do runtime, não
// regex) porque as tags no index.html são multi-linha — regex ingênuo
// quebraria nisso.
const SUPABASE_URL = 'https://ooghhxcrdndulzlrsliz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_wwprRQkGxUNFgwseP5wWpw__3eXzBpT'
const SITE_URL = 'https://jomartecidos.com.br'
const DEFAULT_OG_IMAGE = `${SITE_URL}/logo.png`

interface ProductImageRow {
  url: string
  sort_order: number
}

interface ProductRow {
  name: string
  description: string
  price_per_meter: string
  product_images: ProductImageRow[]
}

class AttributeSetter implements HTMLRewriterElementContentHandlers {
  constructor(
    private attribute: string,
    private value: string,
  ) {}
  element(element: Element) {
    element.setAttribute(this.attribute, this.value)
  }
}

class TextSetter implements HTMLRewriterElementContentHandlers {
  constructor(private content: string) {}
  element(element: Element) {
    element.setInnerContent(this.content)
  }
}

async function fetchProductBySlug(slug: string): Promise<ProductRow | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/products?slug=eq.${encodeURIComponent(slug)}&status=neq.draft` +
      `&select=name,description,price_per_meter,product_images(url,sort_order)`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
  )
  if (!res.ok) return null
  const rows = (await res.json()) as ProductRow[]
  return rows[0] ?? null
}

export const onRequestGet: PagesFunction = async (context) => {
  const slug = context.params.slug as string
  const assetResponse = await context.env.ASSETS.fetch(context.request)

  // Não é HTML (não deveria acontecer nesta rota, mas defensivo) — devolve
  // como veio, sem tentar reescrever.
  const contentType = assetResponse.headers.get('content-type') ?? ''
  if (!contentType.includes('text/html')) return assetResponse

  const product = await fetchProductBySlug(slug)
  if (!product) return assetResponse

  const title = `${product.name} | Jomar Tecidos e Enxovais`
  const priceLabel = Number(product.price_per_meter).toFixed(2).replace('.', ',')
  const description = `${(product.description ?? '').slice(0, 140)} — R$ ${priceLabel}/metro na Jomar Tecidos.`
  const image =
    [...product.product_images].sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? DEFAULT_OG_IMAGE
  const url = `${SITE_URL}/tecidos/${slug}`

  const rewritten = new HTMLRewriter()
    .on('title', new TextSetter(title))
    .on('meta[name="description"]', new AttributeSetter('content', description))
    .on('meta[property="og:title"]', new AttributeSetter('content', title))
    .on('meta[property="og:description"]', new AttributeSetter('content', description))
    .on('meta[property="og:image"]', new AttributeSetter('content', image))
    .on('meta[property="og:url"]', new AttributeSetter('content', url))
    .on('meta[property="og:type"]', new AttributeSetter('content', 'product'))
    .transform(assetResponse)

  // content-length original não bate mais depois da reescrita — deixa o
  // runtime recalcular em vez de servir um header errado.
  const headers = new Headers(rewritten.headers)
  headers.delete('content-length')

  return new Response(rewritten.body, { status: rewritten.status, headers })
}
