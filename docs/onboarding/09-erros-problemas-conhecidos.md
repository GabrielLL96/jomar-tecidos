# 9. Erros e problemas reais já encontrados

Bugs de verdade encontrados durante o desenvolvimento, com causa raiz e fix — não são
hipotéticos. Servem tanto para explicar por que o código tem certas proteções quanto como
referência para reconhecer padrões parecidos no futuro. Itens já detalhados nos arquivos 04/07
são só referenciados aqui, não repetidos.

## Pagamento e checkout (mais graves — envolvem dinheiro real)

### Pedido nascia `'paid'` sem nenhuma cobrança ter sido feita

`create_order()` sempre gravava o pedido como `'paid'` na criação — resquício de quando o
checkout era 100% simulado, nunca atualizado quando a cobrança real (Asaas) entrou. Na
prática, **todo pedido nascia "pago" antes de qualquer cobrança existir do lado da Asaas**.
Achado testando a Fase 2 do pagamento real (14/08). Fix: `create_order()` passa a inserir
sempre com `status: 'pending'`; `paid` só acontece depois, via webhook ou confirmação
síncrona da Edge Function de cobrança. Junto, corrigidas 4 telas de KPI/relatório que
contavam pedido reembolsado como faturamento real, e reforçado o bloqueio de exclusão para
cobrir também pedidos `refunded` (antes só bloqueava `paid`/`shipping`/`delivered`).
**Lição**: qualquer coluna de status com um valor "de repouso" precisa ser conferida de novo
sempre que o significado real daquele status mudar (aqui, "pago" deixou de ser um estado
inicial arbitrário e passou a significar dinheiro de verdade recebido).

### Preço de item de pedido vinha do client sem validação

Antes de `create_order()` existir, `order_items.unit_price` vinha direto do estado do
carrinho no client — qualquer um podia chamar `supabase.from('order_items').insert(...)`
pelo console com um preço arbitrário (testado e confirmado antes da correção). Fix: detalhe
completo no arquivo 04, seção `create_order()`. **Lição geral**: RLS controla _quem_ pode
escrever, nunca _que valor_ está sendo escrito — qualquer INSERT client-side numa tabela
financeira que não relê o valor de uma fonte server-side é adulterável por definição,
independente de RLS estar "correta".

### Checkout não-transacional deixava pedido órfão

Antes de `create_order()`, o checkout era uma sequência de ~6 chamadas separadas do client.
Uma falha no meio (achado real: item de carrinho com `color_id` de uma cor que não existia
mais) deixava um pedido gravado com `order_number` consumido e **zero itens**, visível tanto
no admin quanto para o cliente. Fix: `create_order()` move tudo para uma transação atômica —
qualquer exceção desfaz tudo via rollback. **Lição**: ao testar qualquer fluxo de criação
multi-step, teste também o caminho de falha no meio da sequência, não só o caminho feliz — é
onde esse tipo de dado órfão aparece, e só aparece testando de verdade.

## Banco de dados / Postgres

### GRANT de tabela ausente — o bug mais repetido do projeto

Aconteceu ~10 vezes ao longo do histórico (users, catálogo, site_settings, sequence de
pedido, activity_logs, `service_role` em várias tabelas...). RLS pode estar perfeitamente
correta e a query ainda falha com `42501 permission denied`, porque falta `GRANT` na tabela
para o role. Ver detalhe e regra prática no arquivo 04. Se você criar uma tabela nova e uma
query começar a falhar com permissão negada mesmo com a policy parecendo certa, este é o
primeiro lugar a checar.

### Seed/migration que faz `join` por um identificador gerado aleatoriamente pela UI

Uma migration de seed de avaliações fazia `join products.sku = reviews.sku`, mas o admin
gera SKU aleatório (`ADM-XXXXXXXX`) para todo produto criado pela UI — o join bateu zero
linhas, e o `INSERT` de 0 linhas é sucesso silencioso em SQL (sem erro nenhum). Só foi
percebido testando manualmente no browser ("Avaliações (0)" onde deveria haver 2). Fix:
refeito usando `slug` (estável, gerado pela mesma função tanto no fixture quanto no admin).
**Lição**: qualquer seed/migration que faz `join` contra um identificador "amigável"
precisa confirmar que os dois lados geram esse identificador da mesma forma — testar com um
`select count(*)` antes de confiar no resultado de um insert silencioso.

### Relação 1:1 do Postgrest retorna objeto/`null`, nunca array

Ao embutir uma relação `unique` (ex.: `deliveries.order_id`) dentro de um `.select()` de
`orders`, o Postgrest devolve um objeto único ou `null` — nunca um array, diferente de
relações 1:N. Tratar como array (`row.deliveries[0]`) quebra com `TypeError` quando o pedido
ainda não tem entrega — e como isso acontece dentro da `queryFn`, a exceção fica presa no
estado de erro da query (`isError`), sem aparecer no console. Se uma página só lê `data` do
`useQuery` sem checar `error`/`isError`, o sintoma vira "a página simplesmente não mostra o
dado certo", sem pista nenhuma do motivo. **Regra prática**: antes de embutir uma relação
Postgrest, confirme se a FK do lado embutido é `unique` — se for, é objeto/`null`, não array.

## Frontend / React

### `useEffect` reativo pode correr contra a própria navegação que ele deveria só bloquear

Um guard de rota do tipo `useEffect(() => { if (items.length === 0) navigate('/carrinho') }, [items.length, navigate])` existia para impedir acesso direto ao checkout com carrinho
vazio. Mas o próprio submit (pedido confirmado) chama `clear()` do carrinho e depois navega
para a confirmação — `clear()` também dispara esse efeito reativo, que às vezes vencia a
corrida e jogava o usuário de volta para o carrinho vazio em vez da tela de sucesso. Fix:
efeito **mount-only** (`[]` como deps) — o guard deve rodar só na entrada da página
(protege contra deep-link direto), não deve reagir a mudanças causadas pelo próprio fluxo
que ele está guardando.

### `setState` dentro de `useEffect` é erro de lint neste projeto, não warning

Ver padrão correto no arquivo 03. Se seu código não compila por causa de
`react-hooks/set-state-in-effect`, você provavelmente está tentando "espelhar uma prop/query
num state local" dentro de um efeito puro — use o padrão de guarda por identidade no corpo
do componente em vez disso.

### `overflow-x-hidden` isolado quebra `position: sticky` em qualquer ancestral

Por spec do CSS, quando `overflow-x` não é `visible`, o navegador força `overflow-y`
computado para `auto` — **mesmo com `overflow-y: visible` explícito**. Isso transforma o
elemento num scroll container próprio; se ele for ancestral de algo `sticky`, o sticky para
de funcionar (sem erro nenhum de lint/build/console — só visível testando de verdade no
navegador). É por isso que `overflow-x-hidden` como rede de segurança contra overflow
horizontal só é aplicado no `body` (`index.css`), nunca num `<div>` de layout comum — se
você adicionar um novo wrapper `flex flex-col` com `overflow-x-hidden` e algo dentro dele
parar de "grudar" no scroll, é este o motivo mais provável.

### Conversão `Date ↔ string YYYY-MM-DD` sem componentes locais desloca a data em fuso negativo

Duas direções do mesmo bug, ambas reais neste projeto em algum ponto do histórico:

- **Leitura**: `new Date("2026-08-07")` é interpretado como UTC meia-noite;
  `toLocaleDateString('pt-BR')` converte para o fuso do browser — no Brasil (UTC-3), a data
  exibida volta 1 dia.
- **Escrita**: `new Date().toISOString().slice(0,10)` também converte para UTC — depois de
  ~21h local, a string salva já é a de amanhã.

Fix nos dois sentidos: nunca usar `toISOString()`/`new Date(string)` direto para
`YYYY-MM-DD`; construir a partir de componentes locais explícitos
(`date.getFullYear()`/`getMonth()`/`getDate()` e o inverso,
`new Date(year, month - 1, day)`).

## Edge Functions / Deno

### `service_role` não faz bypass automático de RLS/GRANT neste projeto

Ver detalhe no arquivo 04/07. Se uma Edge Function nova começar a falhar com permissão
negada mesmo usando a service role key, o problema é GRANT ausente, não autenticação errada.

### Erro de Edge Function chega genérico se você não usar o unwrapper certo

O client Supabase só devolve "non-2xx status code" por padrão quando uma Edge Function
retorna erro — a mensagem real do backend fica em `error.context` (uma `Response`) e precisa
ser lida via `.json()`. Use sempre `unwrapFunctionError(error)` (`src/lib/edge-functions.ts`)
ao tratar erro de chamada a Edge Function — `error.message` puro vai mostrar uma mensagem
inútil para o usuário.

### `throw` de negócio dentro do `try` de um `catch` genérico de parse engole a mensagem real

Um padrão como `try { ...; if (!res.ok) throw new Error(body.error) } catch { throw new
Error('erro genérico') }` — onde o `catch` foi pensado só para proteger um `JSON.parse` —
acaba capturando também o `throw` intencional de erro de negócio, perdendo a mensagem
específica. Sempre isole o `throw` de negócio para **fora** do escopo do `try` que só deveria
proteger o parse.
