# 7. Decisões arquiteturais e trade-offs

Este arquivo explica **por que** o projeto é como é — não é um catálogo de features, é o
raciocínio por trás das escolhas que mais afetam como você deve trabalhar nele.

## SPA + Supabase direto, sem backend próprio

Não existe uma API REST/GraphQL intermediária. O frontend fala direto com o Postgres via
`supabase-js` (protegido por RLS) e com lógica de servidor via RPC (`security definer`
functions) ou Edge Functions. **Implicação prática**: toda regra de negócio que precisa ser
confiável (preço, estoque, autorização) tem que estar no banco/Edge Function, nunca só no
frontend — o frontend é, por definição, adulterável (qualquer um pode chamar
`supabase.from(...).insert(...)` direto pelo console com a anon key, que é pública no
bundle). Isso já causou um incidente real corrigido (preço de pedido adulterável antes de
`create_order()` existir, ver arquivo 09) — trate qualquer validação só-no-frontend como UX,
nunca como segurança.

## Migração incremental de mock para dado real

O projeto começou com catálogo e pedidos totalmente mockados (fixtures locais). Catálogo/
endereços/cupons migraram para o Supabase real primeiro; pedidos ficaram mockados por mais
tempo, porque telas de admin que dependiam de pedido real (`/admin/vendas`) não faziam
sentido enquanto o pedido só existia no `localStorage` de quem comprou. Cada migração foi
feita quando havia uma necessidade concreta de UI dependendo do dado real — não antecipada
"porque um dia ia precisar" (YAGNI aplicado de forma consistente ao longo do projeto). Se
você encontrar algo que ainda parece mock, é provável que seja proposital, não esquecido —
confirme antes de assumir que é dívida técnica.

## RLS + GRANT em duas camadas, lógica sensível em `security definer`

Ver detalhe técnico completo no arquivo 04. A decisão de design é: **regra de negócio que
não pode ser violada (preço, estoque, quem pode excluir o quê) vive dentro de uma function
`security definer` no Postgres, não em RLS/GRANT sozinhos**. RLS/GRANT decidem _quem pode
tocar a tabela_; a function decide _o que é uma operação válida_. Isso é mais trabalho para
escrever (SQL puro, sem o conforto de um ORM) mas fecha uma classe inteira de bug de
"esqueci de validar no frontend" — a validação real está no único lugar que importa.

## Sem exclusão física — sempre soft-delete/inativação

`order_items.product_id` é `on delete restrict`, `reviews.product_id` é `on delete cascade`
— o próprio schema já era desenhado para impedir exclusão física de produto. A decisão
generalizou esse princípio: "excluir" no admin é sempre `status = 'draft'` (produto) ou
`deleted_at` (pedido, com regras de quando é permitido), nunca um `DELETE` de verdade.
Reaproveitar um valor de enum já existente (`draft`) em vez de criar uma coluna
`is_active` separada evitou uma segunda fonte de verdade sobre "isso está visível na loja?".

## Gate de admin binário — gap conhecido, não resolvido

`AdminLayout` bloqueia o painel inteiro em `user.role !== 'admin'`. O enum `role` já tem
`vendas`/`estoque`/`marketing`/`suporte`, e algumas policies de RLS de escrita no banco já
usam esses papéis — mas nenhum deles abre nenhuma tela do admin hoje. Isso é uma decisão
deliberadamente adiada (mudar isso afeta o painel inteiro, não uma tela isolada), não um
esquecimento. Se for implementar visibilidade granular por papel, o RLS do banco já está
parcialmente pronto para isso — o trabalho real é no frontend (`AdminLayout` + navegação
condicional por seção).

## `service_role` não é bypass automático neste projeto

Contraintuitivo em relação à documentação padrão do Supabase: aqui, uma Edge Function
rodando com `service_role` **ainda precisa de GRANT explícito** na tabela para
ler/escrever — não ignora RLS/GRANT por mágica. Isso foi descoberto testando, não por
suposição. Toda vez que você criar uma Edge Function nova que precisa tocar uma tabela nova,
confirme o GRANT para `service_role` explicitamente — não assuma que "é service_role, deve
funcionar".

## Segredos de integração: GRANT de coluna, nunca no frontend

Tanto `melhor_envio_settings` quanto `asaas_settings` seguem o mesmo padrão: colunas de
segredo (`client_secret`/`api_key`/tokens) só são legíveis/graváveis por `service_role`.
`authenticated` (mesmo admin) nunca consegue reler o valor salvo — a UI usa functions que
devolvem só `boolean` ("está configurado?"). Ao adicionar uma integração nova, siga
exatamente esse padrão: nunca deixe uma chave secreta legível por `authenticated`, mesmo que
pareça conveniente "só para o admin ver que salvou certo".

## Pagamento com cartão: trade-off consciente de escopo PCI-DSS

Duas formas de aceitar cartão existiam: (a) widget de tokenização hospedado pela própria
Asaas, que nunca envia o número do cartão para a infraestrutura do projeto, ou (b) formulário
próprio no checkout, enviando o dado para uma Edge Function que repassa para a Asaas. O
projeto escolheu (b) — checkout de página única, sem redirecionar o cliente para um formulário
de terceiro. **O trade-off real**: o dado de cartão passa (em trânsito, nunca persistido)
pela nossa Edge Function, o que coloca esse código path em escopo de PCI-DSS de fato, não só
teoricamente. A opção (a) teria escopo de compliance bem menor, ao custo de uma UX mais
fragmentada (redirect ou iframe de terceiro). Se esse trade-off for revisitado no futuro, o
ponto de entrada a mudar é `asaas-charge-card`/`CreditCardFields.tsx`.

## Assimetria de segurança entre os dois webhooks

O webhook da Melhor Envio valida HMAC-SHA256 real; o da Asaas valida um token estático
comparado direto. Não há um motivo técnico documentado para a diferença — é provavelmente
uma questão de quando cada integração foi construída e o que a documentação de cada
provedor deixava mais óbvio de implementar primeiro. Vale igualar os dois ao padrão HMAC se
alguém for mexer nessa área — ver aviso crítico #2 no [README](./README.md).

## Sem ambiente de staging — decisão de fato, não de design

Não há uma arquitetura que _impeça_ um staging (o Supabase suporta múltiplos projetos
normalmente) — é simplesmente uma etapa que não foi feita ainda, identificada como item de
Prioridade Alta pendente na auditoria LGPD do projeto (`docs/lgpd/plano-adequacao.md`). Não
trate a ausência de staging como "é assim que o projeto funciona" — é uma dívida registrada,
com um dono e uma prioridade definida, que ainda não foi paga.

## Três sistemas de log separados, deliberadamente não unificados no banco

`activity_logs` (auditoria de escrita bem-sucedida), `error_logs` (crash/erro de runtime) e
`integration_logs` (chamadas a serviços externos) são three tabelas distintas, cada uma com
seu próprio modelo de RLS e propósito — só a UI (`/admin/logs` e `/admin/integracoes-log`)
os apresenta juntos. A decisão explícita foi não usar um APM externo (Sentry, etc.) para
`error_logs` — tabela própria no Supabase, sem DSN de terceiro, sem risco de PII vazar para
fora do projeto. Trade-off aceito: sem sourcemap deminificado automaticamente, sem alerta
push — só o que está na tabela.

## Vulnerabilidade conhecida em `react-router-dom`, mantida intencionalmente

A versão instalada cai na faixa vulnerável de um advisory (GHSA-qwww-vcr4-c8h2), mas a falha
é específica de **RSC Mode** (Server Actions/CSRF em React Server Components) — este projeto
é uma SPA pura com `BrowserRouter`, sem RSC, vetor não aplicável. Não faça downgrade
"corretivo" sem necessidade real — reavalie só se o projeto migrar para um modo com Server
Actions.
