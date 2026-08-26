# 6. Integrações externas

Três integrações reais: **Asaas** (pagamento), **Melhor Envio** (frete) e **Google Tag
Manager** (analytics, condicionado a consentimento LGPD). Nenhuma delas é chamada
diretamente do frontend — tudo passa por Edge Functions do Supabase, que guardam as
credenciais reais.

## 6.1 Asaas (pagamento)

⚠️ Releia o aviso crítico #1 do [README](./README.md) antes de testar qualquer checkout —
não há staging, e dependendo do `asaas_settings.environment` configurado, um teste pode
cobrar um cartão de verdade.

### Onde a chave fica (e nunca fica)

`asaas_settings` (singleton) guarda `api_key` e `webhook_token` com **GRANT de coluna em
duas camadas**:
- `authenticated` (mesmo sendo admin) tem `SELECT` só em `id, environment, connected_at,
  connected_by, updated_at` — **nunca** consegue ler `api_key`/`webhook_token` de volta,
  mesmo com RLS permitindo a linha inteira.
- Só `service_role` tem `SELECT`/`UPDATE` nessas colunas — e só as Edge Functions rodam com
  esse role.

A UI (`AsaasIntegrationCard.tsx`) nunca pré-preenche o campo de API key — mostra um selo "✓
Configurado" vindo da RPC `asaas_secrets_configured()` (devolve só boolean). Se o admin
salvar sem preencher o campo, o `UPDATE` não inclui a coluna — mandar string vazia
apagaria o secret existente, então o código evita isso de propósito.

Autenticação com a API da Asaas usa o header `access_token: <chave crua>` (não
`Authorization: Bearer` — formato exigido pela Asaas, diferente do padrão OAuth Bearer usado
pela Melhor Envio).

### Checkout com cartão — fluxo completo

1. **Frontend** (`CreditCardFields.tsx`): número/validade/CVV ficam só em memória (React
   Hook Form) — nunca tocam `localStorage`/`useSecureStorage`, nunca são logados. Embutido
   no form único de checkout (não é um `<form>` próprio, para evitar nested forms inválidos).
2. Submit → `chargeAsaasCard(input)` → Edge Function `asaas-charge-card`.
3. **Dentro da Edge Function**:
   - Autentica o chamador via JWT.
   - `enforceRateLimit(userId, 'asaas-charge-card', 5, 600)` — **5 tentativas / 10 min por
     usuário** (mitigação de card testing fraud, ver seção de rate limit abaixo).
   - Relê o pedido do banco (nunca confia no `orderId`+dono vindos do client sem checar),
     confirma que está `pending`.
   - Monta `creditCardHolderInfo` a partir do **cadastro real** (nome/e-mail/CPF/telefone) —
     só CEP/número do endereço vêm do client. CPF/telefone ausentes bloqueiam a cobrança
     (por isso o cadastro passou a exigir CPF, ver arquivo 08).
   - `POST /v3/payments` com `creditCard` + `creditCardHolderInfo` — autorização **síncrona**
     (diferente de Pix/boleto): HTTP 200 = aprovado na hora, HTTP 400 = recusado (mensagem
     específica repassada ao usuário, ex. "cartão sem limite").
   - Aprovado → `order_payments.status = 'confirmed'`, `orders.status = 'paid'`
     **imediatamente** (não espera o webhook — o webhook chega depois mas é idempotente, não
     duplica nem regride o efeito).
   - Se `saveCard: true` → `saved_credit_cards` recebe o token devolvido pela Asaas (nunca
     número/CVV). Falha ao salvar o token não desfaz o pagamento já aprovado.
4. **`getOrCreateAsaasCustomer()`**: a Asaas exige um `customer` cadastrado do lado deles
   antes de qualquer cobrança — criado lazy no primeiro checkout real de cada usuário,
   `asaas_customer_id` salvo em `public.users`.

### Cartão salvo (recobrança sem repetir dados)

`saved_credit_cards` guarda só `credit_card_token` + últimos 4 dígitos + bandeira. RLS:
leitura só do próprio dono; escrita só `service_role`. Checkout usa
`chargeAsaasWithSavedCard()` → `asaas-charge-with-token`, que confirma posse do cartão salvo,
cobra via `creditCardToken` (dado de cartão cru não trafega de novo depois do primeiro save),
mesmo rate limit (5/10min).

### Pix e boleto

`asaas-create-charge` — fatura hospedada pela própria Asaas (`invoiceUrl`), fluxo assíncrono
(confirmação vem só via webhook). Rate limit mais permissivo: 10/10min. Parcelamento (até 3x,
só cartão) validado no servidor. `callback.autoRedirect: true` garante retorno automático
para `/pedido/:id` sem exigir clique manual do cliente na fatura hospedada.

### Webhook (`asaas-webhook`)

⚠️ **Autentica por token estático comparado direto** contra `asaas_settings.webhook_token`
(header `asaas-access-token`) — **não é HMAC**, diferente do webhook da Melhor Envio (ver
6.2). Se esse token vazar, qualquer requisição com ele consegue forjar confirmação de
pagamento/reembolso. Limitação conhecida, não corrigida — ver aviso crítico #2 do
[README](./README.md).

Mapeia evento → status: `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED` → `confirmed`;
`PAYMENT_OVERDUE` → `overdue`; `PAYMENT_DELETED`/`CANCELED` → `cancelled`;
`PAYMENT_REFUNDED` → `refunded`. Transição de `orders.status` só acontece de estados
esperados (`pending → paid`, `paid/shipping/delivered → refunded`) — **idempotente por
design**: reenvio do mesmo evento não duplica histórico nem regride status. Se não encontra
`order_payments` correspondente, responde `200 ok` sem processar (evita reenvio infinito da
Asaas).

### Reembolso (`asaas-refund`)

Admin-only. Suporta **reembolso parcial** — soma reembolsos anteriores, valor pedido não
pode exceder o que resta do total. `orders.status` só vira `refunded` quando o reembolso
cobre o total restante; reembolso parcial não muda o status do pedido.

### Fluxo de status

`pending` (sempre nasce assim) → `paid` (cartão: imediato; Pix/boleto: só via webhook) →
`shipping`/`delivered` (fora do escopo Asaas) → `refunded`. `cancelled` é distinto de
`refunded`: cancelado nunca chegou a ser cobrado; refunded foi cobrado e devolvido.

### Rate limiting

`rate_limit_attempts` + RPC `check_and_record_rate_limit()` (`security definer`,
`EXECUTE` só para `service_role` — um client comum não pode chamar direto, senão poderia
zerar a própria contagem). Achado direto de auditoria LGPD: `asaas-charge-card` não tinha
limite nenhum antes, abrindo espaço para tentar números de cartão em massa.

### Logging

Toda chamada (`asaasFetch()`) grava em `integration_logs` no `finally`. Regra dura no
código: `request_summary`/`response_summary` são **sempre** um resumo allowlist montado à
mão pelo call site — nunca o body cru. Dado de cartão e token nunca entram no log em
nenhuma hipótese; CPF só entra mascarado.

## 6.2 Melhor Envio (frete)

### Por que via Edge Function, e não direto do frontend

O plano original previa o React buscar o `access_token` do Supabase e chamar a Melhor Envio
direto do navegador — identificado como risco antes de implementar (token de
`shipping-calculate`, mesmo sem gerar etiqueta, ainda seria um ativo capturável). Toda
chamada passa por Edge Function: `melhor-envio-oauth-exchange` (troca `code` por token,
admin-only) e `melhor-envio-shipping-calculate` (cotação, qualquer usuário autenticado).

### Segredo protegido pelo mesmo padrão do Asaas

`melhor_envio_settings`: `authenticated` só lê `client_id`/`redirect_uri`/`connected_at`;
`client_secret`/`access_token`/`refresh_token` só `service_role`. Escopo OAuth pedido é só
`shipping-calculate` (não os 8 escopos completos disponíveis) — princípio de menor
privilégio, já que esta fase não gera etiqueta nem move saldo.

### Fluxo de conexão (OAuth)

Roda via **popup** (`window.open`), não redirect de página inteira (mudou depois de
problemas reais em produção, ver arquivo 09). O callback processa dentro do popup, repassa
`code`/`state` para a janela principal via `postMessage`, e se fecha sozinho. Validação de
`state` (CSRF) é guardada em `useRef` na janela principal — não em `sessionStorage`, que não
é confiável para uma janela separada que navega por outra origem e volta.

### Cotação real

`melhor-envio-shipping-calculate` grava cada cotação em `shipping_quotes` (CEP destino +
opções + expira em ~15min) e devolve `quoteId` + opções para o client. No checkout, dispara
sozinho quando o CEP completa 8 dígitos. `create_order()` no servidor releem o preço real
dessa tabela em vez de confiar no valor que o client mandar — mesmo padrão de validação já
usado para `unit_price` (ver arquivo 04).

### Webhook (`melhor-envio-webhook`)

Diferente do webhook da Asaas: valida **HMAC-SHA256 real** via `crypto.subtle`, comparando
com o header `X-ME-Signature`, usando `client_secret` como chave — recusa (401) se o secret
não estiver configurado. Recebe eventos de rastreio/etiqueta; nunca toca `orders.status`
diretamente (só `deliveries`).

### O que não foi implementado (Fase 2, não construída)

Geração de etiqueta e rastreio sincronizado exigem reautorização com mais escopos — fora do
escopo atual, de propósito.

## 6.3 Google Tag Manager / Consentimento LGPD

`src/features/consent/` (`ConsentContext.tsx`, `ConsentBanner.tsx`, `GoogleTagManager.tsx`),
montados globalmente em `RootLayout.tsx`.

**Não é o Google Consent Mode v2** (sem `gtag('consent', 'update', ...)`) — é um mecanismo
caseiro de **opt-in explícito por injeção condicional de script**:

- Estado persistido via `useSecureStorage` (chave `cookie-consent`), amarrado à versão da
  política (`PRIVACY_POLICY_VERSION`). Categoria "essencial" (sessão/auth) nunca é um toggle
  — LGPD art. 7º VI não exige consentimento para isso.
- Banner com 3 ações: Recusar, Aceitar todos, Personalizar (toggle individual de
  "Analíticos").
- `GoogleTagManager.tsx` só injeta o `<script>`/`<noscript><iframe>` do container
  `GTM-M4GCP7VG` se `hasAnalyticsConsent === true`. GA4 é configurado dentro do próprio
  container GTM (no dashboard do Google), não hardcoded no código.
- **Revogação real, não cosmética**: se o usuário já tinha consentido e agora recusa, o
  código força `window.location.reload()` — remover o `<script>` do DOM não para tracking
  já em execução nem limpa cookie já setado pelo Google; só reload garante que a tag não
  volta a carregar.

Transferência internacional de dado via GTM/GA4 (infraestrutura do Google fora do Brasil)
está mapeada em `docs/lgpd/operadores.md`, mas nenhum DPA foi revisado formalmente — pendência
jurídica, não técnica.
