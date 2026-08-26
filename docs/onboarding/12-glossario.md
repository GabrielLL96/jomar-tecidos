# 12. Glossário

## Domínio de negócio (têxtil/loja)

- **Composição** — a fibra/material de um tecido (Linho, Algodão Egípcio, Poliéster, Nylon,
  Seda...). Tabela `compositions`. Um produto pode ter várias composições com percentual
  cada (ex.: 70% algodão + 30% poliéster), somando 100%.
- **Categoria (de navegação)** — agrupamento usado no menu/filtro do site (Linhos, Algodões,
  Sedas, Aviamentos, Rendas). **Não é o mesmo conceito que composição**, mesmo as 5
  categorias originais também existindo como linhas na tabela `compositions` por razões
  históricas — ver `products.category_slug` (campo separado, hardcoded no frontend, sem CRUD
  próprio).
- **Metro/venda por metro** — o produto é vendido por metro linear de tecido, não por
  unidade. `price_per_meter`, `width_m` (largura do rolo), `min_sale_meters` (quantidade
  mínima vendável por pedido, ex. não vender menos de 0,5m).
- **Mais vendido (`is_bestseller`)** — seleção **manual** feita pelo admin, não um cálculo
  real sobre vendas. Pedidos históricos existem no banco desde a Fase 3 (arquivo 08), então
  seria tecnicamente possível calcular de verdade — não foi feito, é curadoria editorial de
  propósito.
- **Estoque baixo/esgotado** — status calculado (`computeStockStatus`) a partir de
  `stock_meters` vs. `min_stock_meters` (limiar configurável por produto, `0` = sem limiar
  definido, nunca dispara "baixo").

## Pedido e checkout

- **Rascunho (`draft`)** — status de produto usado tanto para produto nunca publicado quanto
  para produto "excluído" pelo admin (soft-delete via inativação — não existe exclusão
  física de produto).
- **Pendente/Pago/Enviando/Entregue/Cancelado/Reembolsado** — os 6 status possíveis de
  `orders.status`. `cancelled` = nunca foi cobrado; `refunded` = foi cobrado e o dinheiro
  voltou (distinção importante, não são sinônimos).
- **Cupom** — desconto aplicável no checkout: percentual (capado em 100%), valor fixo, ou
  frete grátis. Tem janela de validade (`starts_at`/`expires_at`) e limite de uso
  (`max_uses`/`used_count`).
- **Frete taxa fixa vs. cotação real** — quando o produto no carrinho não tem peso/dimensão
  cadastrados, o sistema usa uma taxa fixa (hardcoded no servidor, R$25); quando tem, cota em
  tempo real via Melhor Envio. Os dois caminhos coexistem hoje.

## Pagamento (Asaas)

- **Cobrança (`payment`/`order_payments`)** — uma tentativa de cobrança associada a um
  pedido. Um pedido pode, em teoria, ter mais de uma tentativa registrada, mas o fluxo atual
  bloqueia gerar uma segunda cobrança se já existe uma para o pedido.
- **Fatura hospedada (`invoiceUrl`)** — página de pagamento gerada pela própria Asaas, usada
  para Pix/boleto — o cliente é redirecionado (ou vê o QR code embutido) sem o projeto
  processar o dado de pagamento diretamente.
- **Tokenização de cartão** — em vez de guardar número/CVV, a Asaas devolve um
  `creditCardToken` reutilizável para cobranças futuras sem repetir os dados —
  é o que `saved_credit_cards` armazena.
- **Titular (`creditCardHolderInfo`)** — dados do dono do cartão exigidos pela Asaas
  (nome/CPF/e-mail/telefone/CEP), montados a partir do cadastro real do usuário, não digitados
  de novo no checkout.

## Frete (Melhor Envio)

- **Cotação (`shipping_quotes`)** — resultado de consultar preço/prazo de frete para um CEP
  de destino, com validade curta (~15min) — depois disso precisa cotar de novo.
- **Serviço/transportadora** — cada opção de cotação (ex.: Jadlog `.Package`, Jadlog `.Com`)
  tem preço e prazo próprios; o cliente escolhe uma no checkout.
- **Etiqueta** — documento de postagem gerado após a compra do frete — **não implementado**
  neste projeto ainda (Fase 2 da integração, fora de escopo até agora).

## LGPD / Compliance

- **Titular** — a pessoa cujo dado pessoal está sendo tratado (cliente, visitante).
- **Operador** — terceiro que trata dado pessoal em nome do projeto (Asaas, Melhor Envio,
  Google, Supabase, Cloudflare) — mapeados em `docs/lgpd/operadores.md`.
- **DPO/Encarregado** — pessoa responsável por questões de LGPD perante a ANPD e os
  titulares — status jurídico ainda pendente de confirmação formal (ver arquivo 07/08).
- **Base legal** — justificativa jurídica para tratar um dado (consentimento, execução de
  contrato, obrigação legal, etc.) — cada finalidade de tratamento precisa de uma.
- **Direitos do titular (art. 18)** — acesso, correção, eliminação, portabilidade, etc. —
  implementados parcialmente (exclusão de conta self-service existe via `account-delete`;
  os demais foram identificados como pendência técnica na auditoria).

## Termos técnicos específicos deste projeto

- **`security definer`** — function Postgres que roda com o privilégio de quem a criou (o
  dono), não de quem a chama — usada para lógica sensível que precisa de mais acesso do que
  o chamador tem via RLS normal.
- **GRANT vs. RLS** — GRANT decide se o role pode tocar a tabela; RLS decide quais linhas ele
  vê/edita dentro do que o GRANT já permite. Faltando qualquer um dos dois, a operação falha.
- **Adapter (`adaptXxx`)** — função que converte uma linha do Postgres (snake_case, tipos
  crus) para o tipo de domínio usado pelos componentes (camelCase, tipos já convertidos).
- **Singleton (tabela)** — tabela desenhada para ter sempre uma única linha (ex.:
  `asaas_settings`, `melhor_envio_settings`) — configuração global da integração, não um
  registro por usuário/pedido.
