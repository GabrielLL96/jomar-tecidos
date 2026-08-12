# Reprocessar imagens existentes (one-off)

Script pra rodar **uma única vez**, colado no console do DevTools, com a aba logada como
admin no site (dev local ou produção). Reaproveita `resizeImageFile` — mesma lógica usada
nos uploads novos — pra recomprimir as imagens que já estão no Storage (hero, banner, 5
categorias, fotos dos produtos), sobrescrevendo o mesmo path (a URL pública não muda, então
nenhuma tabela precisa ser atualizada) e trocando o `cache-control` pra 1 ano.

**Não commitar isso como feature do admin** — é execução manual, YAGNI de virar tela/botão
(ver spec `2026-08-12-performance-landing-page-design.md`).

## Como rodar

1. Abrir o site (dev local: `https://localhost:5173`, ou produção) logado como admin.
2. Abrir o DevTools → Console.
3. Colar o bloco abaixo e apertar Enter. Acompanhar o log de progresso.
4. Conferir visualmente a Home/PDP depois — script não tem rollback automático.

```js
const { supabase } = await import('/src/lib/supabase.ts')
const { resizeImageFile } = await import('/src/lib/image-compression.ts')
const { extractStoragePath } = await import('/src/lib/utils.ts')
const { SITE_IMAGE_MAX_WIDTH, PRODUCT_IMAGE_MAX_WIDTH } = await import('/src/lib/constants.ts')

async function reprocessAtPath(bucket, url, maxWidth) {
  const path = extractStoragePath(bucket, url)
  if (!path) {
    console.warn('path não extraído, pulando:', url)
    return
  }
  const original = await fetch(url).then((r) => r.blob())
  const file = new File([original], path.split('/').pop(), { type: original.type })
  const resized = await resizeImageFile(file, maxWidth)
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, resized, { upsert: true, cacheControl: '31536000' })
  if (error) throw new Error(`${path}: ${error.message}`)
  console.log('ok:', path, `${original.size}B -> ${resized.size}B`)
}

// 1) site_settings (hero, banner, 5 categorias)
const SITE_IMAGE_KEYS = [
  'home_hero_image_url',
  'home_banner2_image_url',
  'category_image_linhos',
  'category_image_algodoes',
  'category_image_sedas',
  'category_image_aviamentos',
  'category_image_rendas',
]
const { data: settingsRows, error: settingsError } = await supabase
  .from('site_settings')
  .select('key, value')
  .in('key', SITE_IMAGE_KEYS)
if (settingsError) throw new Error(settingsError.message)

for (const row of settingsRows) {
  if (!row.value) continue
  await reprocessAtPath('site-images', row.value, SITE_IMAGE_MAX_WIDTH)
}

// 2) product_images (todas as fotos de produto)
const { data: productImages, error: productImagesError } = await supabase
  .from('product_images')
  .select('id, url')
if (productImagesError) throw new Error(productImagesError.message)

for (const row of productImages) {
  await reprocessAtPath('product-images', row.url, PRODUCT_IMAGE_MAX_WIDTH)
}

console.log('Reprocessamento concluído.')
```

## Nota sobre cache

O path sobrescrito é o mesmo — a URL pública não muda, então nenhuma linha em
`site_settings`/`product_images` precisa ser atualizada. Efeito colateral aceitável: o CDN
(Cloudflare, na frente do Supabase Storage) pode servir a versão antiga em cache por até 1h
após rodar o script (o `cache-control` antigo de 1h ainda vale pra cópias já cacheadas) —
depois disso, todo mundo passa a receber a versão nova com cache de 1 ano.
