# 3. Frontend — rotas, funcionalidades e fluxos

## Roteamento (`src/App.tsx`)

Todas as rotas são `React.lazy`, exceto `Home` (import estático — é a própria rota que a
otimização de performance visa, torná-la lazy adicionaria um round-trip de rede em troca de
nada). Um único `<Suspense fallback={<RouteFallback />}>` envolve todas as rotas.

### Rotas públicas (sob `RootLayout`)

| Rota | Página | Função |
|---|---|---|
| `/` | `Home` | landing — hero, categorias, mais vendidos, novidades (conteúdo vem de `site_settings`) |
| `/tecidos` | `ProductsPage` | catálogo com filtros (material/cor/faixa de preço) |
| `/tecidos/:slug` | `ProductDetailPage` | detalhe do produto, abas (composição/entrega/cuidados/avaliações) |
| `/carrinho` | `CartPage` | carrinho |
| `/checkout` | `CheckoutPage` | endereço, frete, cupom, pagamento (Pix/boleto/cartão) |
| `/pedido/:id` | `ConfirmationPage` | confirmação pós-checkout |
| `/sobre` | `AboutPage` | institucional |
| `/politica-de-privacidade` | `PrivacyPolicyPage` | política LGPD |
| `/contato` | `ContactPage` | contato |
| `/favoritos` | `FavoritesPage` | produtos favoritados (client-side only) |
| `/conta/entrar` | `LoginPage` | login |
| `/conta/esqueci-senha`, `/conta/redefinir-senha` | fluxo de recuperação de senha (Supabase Auth real) |
| `/conta` (+ `/pedidos`, `/enderecos`, `/dados`) | `AccountLayout` + subpáginas | área logada do cliente |
| `*` | `NotFoundPage` | 404 |

Não há um `ProtectedRoute` genérico envolvendo `/conta/*` — a exigência de login é tratada
dentro de cada página/`AccountLayout`, não centralizada em `App.tsx`.

### Rotas admin (sob `AdminLayout`, path `/admin`)

| Rota | Página |
|---|---|
| `/admin` | `AdminDashboardPage` |
| `/admin/produtos` | `AdminProductsPage` |
| `/admin/composicoes` | `AdminCompositionsPage` |
| `/admin/estoque` | `AdminStockPage` |
| `/admin/vendas` (+ `/:id`) | `AdminSalesPage` / `AdminSalesOrderDetailPage` |
| `/admin/entregas` | `AdminDeliveriesPage` |
| `/admin/cupons` | `AdminCouponsPage` |
| `/admin/usuarios` | `AdminUsersPage` |
| `/admin/relatorios` | `AdminReportsPage` |
| `/admin/configuracoes` | `AdminSettingsPage` |
| `/admin/logs` | `AdminLogsPage` (auditoria + erros, unificados) |
| `/admin/integracoes-log` | `AdminIntegrationLogPage` (chamadas a Asaas/Melhor Envio) |
| `/admin/melhor-envio/callback` | `AdminMelhorEnvioCallbackPage` (processa retorno do OAuth) |

Toda a proteção do `/admin/*` acontece **num único ponto** dentro de `AdminLayout`, não por
rota — detalhe completo em
[05-autenticacao-autorizacao.md](./05-autenticacao-autorizacao.md).

## Fluxo da loja (cliente)

1. **Catálogo** (`/tecidos`) — lê `productsQueryOptions` (filtra `status <> 'draft'` no
   servidor via RLS, não só no client). Filtro por composição (material), cor, faixa de
   preço.
2. **Produto** (`/tecidos/:slug`) — `productQueryOptions(slug)`, mesmo filtro de status.
   Estoque zerado desabilita compra; `min_sale_meters` limita a quantidade mínima vendável.
3. **Carrinho** (`CartContext`) — client-side, persiste itens (produto + cor + metros).
4. **Checkout** (`/checkout`) — exige login (desde o commit `6b7af6e`, 2026-08-13). Fluxo:
   endereço (novo ou existente) → cálculo de frete (cotação real via Melhor Envio, dispara
   sozinho quando o CEP completa 8 dígitos) → cupom opcional → método de pagamento (Pix,
   boleto ou cartão) → submit chama a RPC `create_order()`, que faz tudo numa transação
   atômica no servidor (releitura de preço, estoque, frete e cupom — nunca confia no valor
   que o client mandou). Ver [04-banco-de-dados.md](./04-banco-de-dados.md) para o detalhe
   de `create_order()` e [06-integracoes-externas.md](./06-integracoes-externas.md) para o
   fluxo de pagamento em si.
5. **Confirmação** (`/pedido/:id`) — lê o pedido recém-criado via `orderQueryOptions(id)`.
6. **Minha Conta** (`/conta/*`) — pedidos, endereços, dados cadastrais (CPF/telefone, exigidos
   desde a integração de pagamento real).

## Padrão de hidratação de formulário a partir de dado assíncrono

O projeto tem o React Compiler ativo via ESLint — `setState` dentro de `useEffect` puro para
"espelhar uma prop/query num state local" é tratado como **erro de lint**, não warning
(`react-hooks/set-state-in-effect`). O padrão correto usado no projeto é comparar contra um
id guardado em state e ajustar direto no corpo do componente:

```tsx
const [syncedId, setSyncedId] = useState<string | undefined>(undefined)
if (data && data.id !== syncedId) {
  setSyncedId(data.id)
  setFoo(data.foo ?? '')
}
```

Isso também resolve de graça o caso de trocar de registro sem desmontar o componente (ex.:
navegar entre `/admin/vendas/:id` diferentes). Só recorra a `useEffect` real quando o efeito
também precisa tocar um sistema externo de verdade (History API, DOM) — nesse caso um
`// eslint-disable-next-line react-hooks/set-state-in-effect` pontual, **na linha do
`setState`**, é aceitável.

## Painel admin — visão geral

Gate único (ver arquivo 05): `role !== 'admin'` bloqueia o painel inteiro — não há
visibilidade por seção conforme o papel (`vendas`/`estoque`/`marketing`/`suporte` existem
como valores de enum no banco, inclusive já usados em algumas RLS policies de escrita, mas
nenhum deles consegue abrir nenhuma tela do admin hoje). Isso é um gap conhecido, não
resolvido — ver [07-decisoes-arquiteturais.md](./07-decisoes-arquiteturais.md).

Padrão de cada tela de listagem do admin (Produtos, Estoque, Vendas, Usuários, Cupons):
busca em tempo real + filtros por `Select`, tabela com ação por linha, sem paginação
server-side (catálogo é pequeno — decisão YAGNI documentada, reavaliar se o volume crescer).
Nenhuma tela tem exclusão física — "excluir" é sempre soft-delete ou inativação
(`status = 'draft'` para produto, `deleted_at` para pedido) porque o schema tem FKs
`on delete restrict`/`cascade` que tornariam exclusão física arriscada (destruiria histórico
fiscal ou avaliações de cliente).
