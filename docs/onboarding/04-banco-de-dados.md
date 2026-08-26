# 4. Banco de dados (Supabase/Postgres)

54 migrations em `supabase/migrations/`, aplicadas em ordem cronológica pelo prefixo de
timestamp do nome do arquivo. Este documento resume o **estado atual** do schema; a lista
completa de migrations com o que cada uma fez está em
[08-evolucao-historica.md](./08-evolucao-historica.md) para quem precisar entender uma
decisão específica.

## Modelo de dados por domínio

### Catálogo
- **`products`** — SKU, nome, `slug`/`category_slug`, `price_per_meter`, `width_m`,
  `stock_meters`, `min_sale_meters`, `min_stock_meters`, `status`
  (`active|low_stock|out_of_stock|draft` — `draft` é também o soft-delete), `is_bestseller`,
  `tag`, dimensões de embalagem (`weight_grams`, `package_*_cm`, usadas na cotação de frete).
- **`compositions`** — fibra/material (Linho, Algodão, Seda...), com `color` (swatch) e
  `sort_order`.
- **`product_compositions`** — N:N `products`↔`compositions`, com `percentage` (soma deve
  fechar 100% por produto, validado no frontend e reforçado no admin).
- **`product_colors`** — cores disponíveis por produto.
- **`product_images`** — imagens por produto, ordenadas.
- **`reviews`** — avaliação por produto, `user_id` nullable (`on delete set null` — apagar
  usuário não apaga a review).
- **`stock_movements`** — ledger de ajuste de estoque (entrada/saída com motivo obrigatório).

### Usuários e endereços
- **`users`** — espelha `auth.users` (mesmo `id`), populada automaticamente por trigger no
  cadastro. `role` (enum: `customer|admin|vendas|estoque|marketing|suporte`), `cpf` (unique,
  exigido desde a integração de pagamento), `asaas_customer_id`, `last_login_at`.
- **`addresses`** — `is_default` garantido único por usuário via trigger
  (`fn_enforce_single_default_address`, a mudança mais recente do projeto).

### Pedidos e checkout
- **`orders`** — `order_number` (via sequence), `status`
  (`pending|paid|shipping|delivered|cancelled|refunded`), `subtotal`/`shipping_cost`/
  `discount_total`/`total`, `deleted_at` (soft-delete, só gravável pela function
  `delete_order()`).
- **`order_items`** — `unit_price` sempre gravado pelo servidor (nunca aceita o valor que o
  client mandar).
- **`order_status_history`** — ledger append-only de toda transição de status.
- **`coupons`** — percentual (limitado a ≤100% por `CHECK`), fixo, ou frete grátis;
  `starts_at`/`expires_at`/`max_uses`.
- **`shipping_quotes`** — cache de cotação real de frete (Melhor Envio), ~15min de validade,
  usada por `create_order()` como fonte de verdade de preço de frete.
- **`deliveries`** — rastreio (`tracking_code`/`tracking_url`), correlação com Melhor Envio
  (`melhor_envio_shipment_id`/`protocol`, ainda não populados — geração de etiqueta é fase
  futura não implementada).

### Pagamentos (Asaas)
- **`order_payments`** — uma linha por tentativa de cobrança real (`asaas_payment_id`
  unique), `status` (`pending|confirmed|overdue|cancelled|refunded`), campos específicos por
  método (QR code Pix, boleto, parcelamento).
- **`refunds`** — 1:N por pedido, suporta reembolso parcial.
- **`saved_credit_cards`** — só token + últimos 4 dígitos + bandeira, nunca dado de cartão
  cru.
- **`rate_limit_attempts`** — controle de tentativas de cobrança por usuário/endpoint.

### Configuração de integrações
- **`melhor_envio_settings`**, **`asaas_settings`** — cada uma é uma tabela singleton
  (uma única linha) com colunas de config editáveis por admin e colunas de segredo
  (`client_secret`/`access_token`/`api_key`) graváveis e legíveis **só** por `service_role`.
- **`site_settings`** — chave/valor genérico (conteúdo da Home, `free_shipping_threshold`,
  CEP de origem).

### Auditoria e logs
- **`activity_logs`** — auditoria real de escrita bem-sucedida (produtos, pedidos, usuários,
  composições, cupons, entregas, estoque, reembolso, pagamento). Imutável para
  `authenticated` — só triggers `security definer` escrevem.
- **`error_logs`** — erros de runtime capturados no client (`window.onerror`,
  `unhandledrejection`, error boundary do React). Qualquer visitante pode inserir; só admin lê.
- **`integration_logs`** — toda chamada de saída/entrada com Asaas e Melhor Envio, com
  resumo allowlist da requisição/resposta (nunca o body cru — dado de cartão nunca entra
  aqui em nenhuma hipótese).

## Padrão de autorização (RLS + GRANT)

O modelo de segurança do banco tem duas camadas independentes, e as duas precisam estar
certas:

1. **GRANT de tabela** — sem `GRANT SELECT/INSERT/UPDATE/DELETE` explícito para o role
   (`anon`, `authenticated` ou `service_role`), o Postgres nega com `42501 permission denied`
   **antes de sequer avaliar a policy de RLS**. Isso pegou o projeto de surpresa umas 10
   vezes ao longo do histórico (users, catálogo, site_settings, sequence de pedido,
   activity_logs...) — inclusive para `service_role` dentro de Edge Functions, que **não faz
   bypass automático de RLS/GRANT neste projeto** (achado documentado, contraintuitivo em
   relação à doc padrão do Supabase). **Sempre que criar uma tabela nova, conceda GRANT
   explícito antes de testar** — não assuma que RLS sozinha basta.

2. **RLS (Row Level Security)** — a policy em si. Padrão dominante: função
   `current_user_role()` (`security definer`, lê `role` de `public.users` com o privilégio da
   function, evitando recursão de RLS), usada em condições como
   `current_user_role() in ('admin', 'vendas', 'estoque')`.

3. **GRANT por coluna**, quando o risco é escrever/ler um campo específico, não a linha
   inteira:
   - `users`: `grant update (name, phone) on users to authenticated` — cliente não consegue
     alterar `role`/`status` mesmo tendo UPDATE geral na tabela.
   - `melhor_envio_settings`/`asaas_settings`: `authenticated` nunca tem `SELECT` nas colunas
     de segredo — só `service_role`. A UI usa functions (`asaas_secrets_configured()`) que
     devolvem só um boolean.

### Exemplos reais de policy

```sql
-- produtos: visitante só vê o que não é rascunho; staff vê tudo
create policy "products_public_read" on public.products for select
  using (status <> 'draft' or current_user_role() in ('admin', 'vendas', 'estoque'));

-- pedidos: cliente nunca tem UPDATE — só staff, ou as functions RPC
create policy "orders_update_staff" on public.orders for update
  using (current_user_role() in ('admin', 'vendas', 'estoque'))
  with check (current_user_role() in ('admin', 'vendas', 'estoque'));
```

### Auditoria é imutável mesmo para admin

`revoke insert, update, delete on activity_logs from authenticated` — nem um admin logado
escreve direto na tabela de auditoria. A única via é o trigger `fn_audit_log()`, que roda
como dono da function (`security definer`), sem precisar de GRANT para `authenticated`.

## Functions `security definer` críticas (lógica de negócio no servidor)

### `create_order()` — a mais importante do sistema

```sql
create_order(p_shipping_address_id uuid, p_payment_method payment_method,
  p_coupon_id uuid default null, p_shipping_cost numeric default 0, p_items jsonb default '[]',
  p_shipping_quote_id uuid default null, p_shipping_service_id integer default null)
returns table (id uuid, order_number text)
```

Move o checkout inteiro para uma única transação atômica no servidor. Por que precisa ser
`security definer`: precisa gravar em várias tabelas com garantias que a RLS normal do
cliente não daria, e precisa travar linhas (`FOR UPDATE`) em `products`/`coupons`/
`shipping_quotes` para evitar concorrência.

**Nunca confia em valor vindo do client**:
- `unit_price` sempre relido de `products.price_per_meter`.
- `FOR UPDATE` em `products` durante a transação — evita overselling em compra concorrente.
- Frete: cotação real validada contra `shipping_quotes` (rejeitando se expirada); sem
  cotação, taxa fixa hardcoded no servidor; frete grátis decidido pelo servidor via
  `site_settings.free_shipping_threshold`, nunca pelo valor que o client mandar.
- Cupom: valida status/expiração/`max_uses` com `FOR UPDATE`, clamp defensivo garante que o
  desconto nunca excede subtotal+frete.
- Pedido sempre nasce `status = 'pending'` — nunca `'paid'` (bug histórico já corrigido, ver
  arquivo 08).

**Armadilha de Postgres a conhecer se for alterar esta function**: `RETURNS TABLE (id uuid, ...)`
cria uma variável implícita `id` no escopo — qualquer `where id = ...` não qualificado numa
query interna vira ambíguo (`column reference "id" is ambiguous`), erro só em runtime, nada
acusa em lint/type-check. Sempre qualifique (`products.id = ...`) dentro dessa function.

**Outra armadilha real**: se você adicionar parâmetros novos (mudando a lista de *tipos* da
assinatura, não só valores default de parâmetros existentes), `create or replace function`
**não substitui** a function antiga — cria uma segunda function sobrecarregada, deixando a
versão antiga (sem sua validação nova) ainda chamável. Sempre faça
`drop function if exists public.create_order(<assinatura antiga exata>)` antes do
`create or replace` quando mudar tipos de parâmetro, e teste depois que uma chamada no
formato antigo resolve para a versão nova.

### `delete_order(p_order_id uuid)`
Único jeito de gravar `orders.deleted_at` (coluna com `UPDATE` revogado de `authenticated`).
Admin-only. Bloqueia exclusão se `status in ('paid','shipping','delivered','refunded')` —
tem que cancelar/estornar antes.

### `check_and_record_rate_limit(...)`
`security definer`, `GRANT EXECUTE` só para `service_role` — usada pelas Edge Functions de
cobrança para limitar tentativas (mitigação de card testing fraud).

### `melhor_envio_secret_configured()` / `asaas_secrets_configured()`
Devolvem só booleano — nunca o valor do segredo. É assim que a UI mostra "✓ Configurado" sem
nunca reabrir o secret salvo.

### Triggers de auditoria (`fn_audit_log()` e dedicados)
`fn_audit_log()` cobre a maioria das tabelas; `fn_audit_stock_movement()`,
`fn_audit_refund()`, `fn_audit_order_payment()` são dedicados porque precisam apontar
`entity_id` para o **pedido relacionado**, não para o id da própria linha (permite "clicar no
log → ir direto pro pedido"). CPF é mascarado automaticamente quando a tabela auditada é
`users`.

### `handle_new_user()`
Trigger em `auth.users` que cria a linha em `public.users` no cadastro. **Não** tenta ler
`role` de `raw_app_meta_data` dentro de si mesma (uma tentativa anterior foi revertida — o
GoTrue popula `app_metadata` numa operação separada, depois do INSERT que dispara o
trigger). Promoção a `admin` é sempre um `UPDATE` explícito feito pela Edge Function
`admin-create-user`, depois de confirmar a criação real via Admin API.

## Client Supabase no frontend (`src/lib/supabase.ts`)

Usa **só a anon key** — nunca a service role key, que fica restrita ao runtime das Edge
Functions. Sessão não usa o `localStorage` padrão do Supabase Auth: usa
`secureCookieStorage` (`src/lib/secureCookieStorage.ts`) — cookies `Secure`/`SameSite=Lax`,
criptografados com AES, divididos em chunks (limite de ~4KB por cookie), `Max-Age` de 30
dias. `detectSessionInUrl: true` é necessário para o fluxo de recuperação de senha.

## Regenerando tipos após alterar o schema

Sempre que aplicar uma migration nova, rode `npm run gen:types` para atualizar
`src/lib/database.types.ts` — é o único jeito do TypeScript saber sobre a mudança. Esquecer
esse passo não quebra o build (o tipo antigo continua compilando), mas deixa o app sem
autocomplete/checagem de tipo correta para o schema real.
