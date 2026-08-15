// Cloudflare Pages Function — roda em /sitemap.xml, gerado a cada request a
// partir do catálogo real (Supabase), não é arquivo estático. Sem isso, o
// sitemap ficaria desatualizado toda vez que um produto novo fosse criado
// no admin, sem precisar de rebuild.
//
// URL/key públicas (mesmas embutidas no bundle do client, sem risco expor
// aqui) — hardcoded de propósito: Cloudflare Pages Functions não compartilha
// as env vars VITE_* do build do Vite, e não há necessidade de tratar como
// secret algo que já é público no bundle.
const SUPABASE_URL = 'https://ooghhxcrdndulzlrsliz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_wwprRQkGxUNFgwseP5wWpw__3eXzBpT'
const SITE_URL = 'https://jomartecidos.com.br'

interface ProductRow {
  slug: string
  created_at: string
}

const STATIC_URLS = ['/', '/tecidos', '/sobre', '/contato', '/politica-de-privacidade']

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;')
}

export async function onRequestGet(): Promise<Response> {
  let products: ProductRow[] = []
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/products?select=slug,created_at&status=neq.draft&order=created_at.desc`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
    )
    if (res.ok) products = await res.json()
  } catch {
    // Falha ao buscar produtos não deve derrubar o sitemap inteiro — cai
    // pra só as URLs estáticas, mais seguro que devolver 500 pro Google.
  }

  const staticEntries = STATIC_URLS.map(
    (path) => `  <url><loc>${SITE_URL}${path}</loc><changefreq>daily</changefreq></url>`,
  )
  const productEntries = products.map(
    (product) =>
      `  <url><loc>${SITE_URL}/tecidos/${escapeXml(product.slug)}</loc><lastmod>${product.created_at.slice(0, 10)}</lastmod><changefreq>weekly</changefreq></url>`,
  )

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...staticEntries, ...productEntries].join('\n')}\n</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
