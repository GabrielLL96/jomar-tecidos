# 10. Deploy e ambientes

## Não há três ambientes — há dois, e um deles faz dupla função

- **Dev local** (`npm run dev`) — roda na sua máquina, mas conecta no **mesmo projeto
  Supabase de produção**. Não existe um projeto Supabase separado para desenvolvimento/teste.
- **Produção** (`jomartecidos.com.br`) — mesma base de código, mesmo banco.

Não existe staging. Isso está registrado como pendência de Prioridade Alta na auditoria LGPD
do projeto, não é uma omissão deste guia. Releia o aviso crítico #1 no
[README](./README.md) antes de continuar.

## Mecanismo de deploy: Cloudflare Pages

Produção roda em **Cloudflare Pages** (projeto `jomar-tecidos`), conectado via GitHub sync
ao branch `main`. **Todo `git push` para `main` dispara deploy automático**, com
propagação em ~2 minutos. Não há um passo manual de "publicar" separado — o push _é_ o
deploy.

Implicações práticas:

- Um push com erro de build quebra o site em produção depois de ~2 minutos, sem gate
  intermediário (não há CI bloqueando merge por enquanto).
- Trate qualquer `git push` para `main` com a mesma cautela que uma ação de produção
  qualquer — porque é uma.
- SEO server-side (meta tags/Open Graph dinâmico) é servido via **Cloudflare Pages
  Function** — não confundir com as Edge Functions do Supabase (são coisas diferentes:
  Pages Function roda na borda da Cloudflare para servir HTML com meta tags corretas antes
  do JS carregar; Edge Functions do Supabase rodam no runtime Deno do Supabase para lógica
  de backend).

Para checar o histórico de deploys por commit (útil para confirmar se um push já propagou
antes de pedir para alguém testar em produção), use o `wrangler` (CLI da Cloudflare) já
configurado:

```bash
wrangler pages deployment list --project-name=jomar-tecidos
```

## Variáveis de ambiente por contexto

| Onde roda                                   | Como as env vars chegam                                                                                                                                                                                           |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dev local                                   | Arquivo `.env` (ver arquivo 01)                                                                                                                                                                                   |
| Build de produção (Cloudflare Pages)        | Configuradas no painel do Cloudflare Pages para o projeto `jomar-tecidos`, não no repositório — confirme os valores lá diretamente se for investigar algo específico de produção, este guia não reproduz segredos |
| Edge Functions (Supabase)                   | `SUPABASE_SERVICE_ROLE_KEY` e afins são injetadas automaticamente pelo runtime Deno do Supabase — não configuradas manualmente por env var de app                                                                 |
| Segredos de integração (Asaas/Melhor Envio) | **Não ficam em variável de ambiente nenhuma** — ficam em colunas de banco protegidas por GRANT (`asaas_settings`/`melhor_envio_settings`), configuráveis pela UI de `/admin/configuracoes`. Ver arquivo 06.       |

## Deploy de Edge Functions

Edge Functions **não** fazem deploy automático pelo push para `main` — são publicadas
manualmente via Supabase CLI:

```bash
npm run fn:deploy:asaas-webhook       # exemplo — uma function específica
npm run fn:deploy:all                  # todas de uma vez
```

Se você alterar o código de uma Edge Function e não rodar o deploy correspondente, a
mudança **não** vai para produção — diferente do frontend, onde o push já é suficiente.
Isso é uma fonte comum de confusão: "eu já commitei e pushei, por que a Edge Function ainda
está com o comportamento antigo?" — porque falta o passo de deploy manual dela.

## Migrations de banco

`npm run db:push` aplica migrations pendentes diretamente no projeto Supabase real — de novo,
não há ambiente intermediário para validar uma migration antes. Depois de aplicar, rode
`npm run gen:types` para atualizar `src/lib/database.types.ts` (ver arquivo 04) — esse passo
é separado e fácil de esquecer.

## Checklist antes de fazer push para `main`

1. `npx tsc -b --noEmit` e `npx eslint . --cache` passando (não `npm run build`, que
   reformata o repo inteiro — ver arquivo 01).
2. Se mexeu em Edge Function: já rodou o `fn:deploy:*` correspondente, ou está ciente que
   vai rodar logo em seguida.
3. Se mexeu em schema: migration aplicada via `db:push` e `gen:types` rodado.
4. Se testou checkout/pagamento localmente: está ciente de que criou dado real em produção
   (ver aviso crítico #1) — considere se precisa limpar depois.
