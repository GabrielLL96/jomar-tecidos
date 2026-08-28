# 2. Arquitetura e organização do projeto

## Stack

- **Frontend**: React 19 + TypeScript + Vite 8
- **UI**: Tailwind CSS v4 (config-in-CSS, sem `tailwind.config.js`) + shadcn/ui (estilo
  `radix-nova`, ícones Lucide) + Radix UI
- **Estado de servidor**: TanStack Query v5 (`queryOptions` pattern)
- **Formulários**: React Hook Form + Zod
- **Roteamento**: React Router DOM v7
- **Backend**: Supabase (Postgres + Auth + Storage + Edge Functions), acessado direto pelo
  client — não há API REST própria intermediária
- **Pagamento**: Asaas (Pix, boleto, cartão)
- **Frete**: Melhor Envio (OAuth2 + cotação real)
- **Analytics**: Google Tag Manager, condicionado a consentimento LGPD

## Estrutura de `src/`

```
src/
├── App.tsx                 # todas as rotas (React Router), quase tudo lazy-loaded
├── main.tsx                 # bootstrap: QueryClientProvider, BrowserRouter, Toaster, ReactQueryDevtools
├── index.css                 # tema Tailwind v4 (@theme inline), reset, overflow-x-hidden global
├── components/
│   ├── common/                # ErrorBoundary, ImagePlaceholder, ImageUploadField, RouteFallback, ScrollToTop
│   ├── layout/                  # Header, Footer, RootLayout, UtilityBar, WhatsAppButton, Logo
│   └── ui/                      # componentes shadcn/radix (button, dialog, sheet, table, tabs, select...)
├── features/                  # lógica de domínio — ver tabela abaixo
├── hooks/                       # hooks genéricos (hoje só useSecureStorage.ts)
├── lib/                          # infraestrutura: supabase client, axios, query-client, utils, formatação, SEO
└── pages/                        # componentes de rota (montam features + components)
    ├── admin/                     # todas as páginas /admin/*
    ├── auth/                      # login, conta, recuperação de senha
    ├── cart/, checkout/, contact/, products/
    └── Home.tsx, AboutPage.tsx, FavoritesPage.tsx, PrivacyPolicyPage.tsx, NotFoundPage.tsx
```

**Regra de dependência**: `pages/` consome `features/` e `components/`; `features/` não
importa de `pages/`; `components/` é agnóstico de domínio de negócio (não sabe o que é um
"pedido" ou um "produto"). `lib/` é a camada mais baixa, sem dependência de domínio nenhuma.

## `src/features/` — inventário completo

Cada feature segue o mesmo padrão interno: `queries.ts` (acesso a dados + adapters
Postgres→domínio), `hooks.ts` (wrapper fino de `useQuery`/`useMutation` em cima das
queryOptions), `types.ts`, e ocasionalmente um `*Context.tsx` para estado global client-side.

| Feature             | Responsabilidade                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `account/`          | Endereços do usuário logado (`AddressesContext`) — dado real no Supabase                                                  |
| `asaas/`            | Integração de pagamento: chamadas às Edge Functions de cobrança/reembolso, status de conexão                              |
| `audit/`            | Leitura de `activity_logs` (auditoria de ações administrativas) para a tela de logs                                       |
| `auth/`             | `AuthContext` — login/sessão/papel do usuário, fonte de verdade do gate do admin                                          |
| `cart/`             | Carrinho de compras (`CartContext`)                                                                                       |
| `catalog/`          | Produtos, composições, categorias — queries públicas e variante admin (sem filtro de rascunho)                            |
| `consent/`          | Consentimento LGPD de cookies/analytics (`ConsentContext`), controla injeção do GTM                                       |
| `error-logs/`       | Leitura de `error_logs` (erros de runtime capturados no client)                                                           |
| `favorites/`        | Lista de favoritos — client-side puro, via `useSecureStorage`, sem tabela no banco                                        |
| `integration-logs/` | Leitura de `integration_logs` (chamadas a Asaas/Melhor Envio) para o admin                                                |
| `logs-overview/`    | Agrega `audit` + `error-logs` num único feed unificado, para a tela `/admin/logs`                                         |
| `melhor-envio/`     | Fluxo OAuth de conexão e cotação de frete                                                                                 |
| `orders/`           | Pedidos — monta o objeto `Order` completo (itens, entrega, pagamento, reembolsos, histórico) num único `select` com joins |
| `site-settings/`    | Conteúdo editável da Home/rodapé, configs internas (frete grátis, etc.)                                                   |
| `stock/`            | Movimentações de estoque                                                                                                  |
| `users/`            | Gestão de usuários no admin                                                                                               |

## Convenções de código (observadas no código real, não aspiracionais)

- **`queryOptions` do TanStack Query** para toda leitura — `xxxQueryOptions` (constante,
  sem parâmetro) ou `xxxQueryOptions(param)` (função, com parâmetro), sempre retornando
  `queryOptions({...})`. Isso dá tipagem compartilhada entre `useQuery`,
  `queryClient.prefetchQuery` e `invalidateQueries`.
- **`hooks.ts` é uma camada fina**: cada hook é essencialmente
  `export const useXxx = (arg) => useQuery(xxxQueryOptions(arg))`, sem lógica adicional.
- **`queryKey` como array `as const`, prefixado pela entidade**: `['products']`,
  `['products', 'admin']`, `['orders', 'mine', userId]` — permite invalidar por prefixo.
- **Adapters DB → domínio**: toda feature com dado relacional define um tipo `XxxRow`
  (snake_case, espelhando o Postgres) e uma função `adaptXxx(row): Xxx` (camelCase,
  `Number(...)` explícito em colunas numéricas que o Postgres devolve como string). Nunca
  usar o tipo gerado (`database.types.ts`) direto nos componentes.
- **Erro em query direta ao Supabase**: `const { data, error } = await supabase...; if (error) throw new Error(error.message); return data` — o React Query captura a exceção nativamente.
- **Erro em chamada a Edge Function**: usar `unwrapFunctionError(error)`
  (`src/lib/edge-functions.ts`), não `error.message` puro — o client Supabase só devolve
  mensagem genérica ("non-2xx status code"); a mensagem real do backend fica em
  `error.context` (uma `Response`) e precisa ser lida via `.json()`.
- **Mutations majoritariamente NÃO usam `useMutation`** — o padrão dominante no admin é uma
  função `async` local dentro do componente, chamando Supabase direto, com
  `if (error) { toast.error(...); return }` seguido de
  `await queryClient.invalidateQueries({ queryKey: [...] })` manual. A exceção confirmada é
  `site-settings/hooks.ts` (`useUpdateSiteSetting`). Ao escrever código novo, siga o padrão
  dominante (função local) a menos que haja necessidade real de optimistic update.
- **Export**: named exports em tudo dentro de `features/`/`pages/` — sem `export default`
  (exceção: `App.tsx`, exigido pelo entry point do Vite).
- **Comentários**: só onde explicam _por que_ (edge case de Postgrest, race condition,
  comportamento de trigger) — não _o que_ o código faz. Siga esse padrão ao adicionar código.
- **Formatação**: sem ponto-e-vírgula, aspas simples, `printWidth: 100` (`.prettierrc`).

## Tooling

- **Alias de import**: `@/*` → `src/*` (configurado em `vite.config.ts`, `tsconfig.json` e
  `tsconfig.app.json` — os três precisam ficar em sincronia se mudar).
- **TypeScript**: `verbatimModuleSyntax: true` (obriga `import type { ... }` para imports só
  de tipo), `noUnusedLocals`/`noUnusedParameters: true`, `erasableSyntaxOnly: true` (restringe
  a construções TS que não geram runtime — ex.: não é permitido usar `enum`).
  `tsconfig.json` raiz é só um roteador (`files: []` + `references`) — por isso `type-check`
  precisa do `-b` (ver arquivo 01).
- **ESLint**: flat config (`eslint.config.js`), `react-hooks` com regras `recommended`
  (inclui `exhaustive-deps` — projeto usa React Compiler, então violações viram **erro**, não
  warning, em casos como `setState` dentro de `useEffect` puro — ver
  [03-frontend-funcionalidades.md](./03-frontend-funcionalidades.md) para o padrão correto).
- **shadcn/ui**: `components.json` define estilo `radix-nova`, base `neutral`, ícones
  `lucide`. Componentes gerados ficam em `src/components/ui/` — a base do `button.tsx` tem
  `cursor-pointer` adicionado manualmente na `cva` (o estilo `new-york`/`radix-nova` upstream
  não inclui isso por padrão). Ao rodar `npx shadcn add <componente>` num ambiente não
  interativo, alimente `n` via stdin (`printf 'n\n' | npx shadcn add ...`) se ele pedir
  confirmação de overwrite de uma dependência já customizada — não aceitar sobrescrever sem
  querer apaga customizações como essa.
