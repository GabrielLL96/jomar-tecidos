# 11. Manutenção e evolução — checklists práticos

## Adicionando uma página/rota nova

1. Crie o componente em `src/pages/<área>/NomeDaPagina.tsx`, **named export** (não
   `export default`).
2. Registre em `App.tsx` como `React.lazy(() => import('@/pages/.../NomeDaPagina').then(m => ({ default: m.NomeDaPagina })))`
   — siga o padrão existente, não use `export default` na página só para simplificar o lazy.
3. Se for rota admin, ela já herda o gate de `AdminLayout` automaticamente (não precisa de
   proteção própria). Se for rota de área logada do cliente (`/conta/*`), a proteção é feita
   dentro da própria página/`AccountLayout` — confira como as páginas existentes de `/conta`
   fazem isso antes de inventar um padrão novo.
4. Adicione ao `AdminLayout`/nav correspondente se for uma tela nova do admin.

## Adicionando uma feature nova (`src/features/<nome>/`)

Siga a estrutura já validada em features existentes (`catalog/`, `orders/` são bons
exemplos):

- `types.ts` — tipo de domínio (camelCase) e, se houver dado relacional, o tipo `XxxRow`
  (snake_case, espelhando o Postgres).
- `queries.ts` — `xxxQueryOptions` via `queryOptions()`, com `adaptXxx(row)` fazendo a
  conversão Row→domínio.
- `hooks.ts` — wrapper fino `useXxx = (arg) => useQuery(xxxQueryOptions(arg))`.
- Mutação: siga o padrão dominante (função local no componente + `invalidateQueries` manual)
  a menos que haja necessidade real de optimistic update — não introduza `useMutation` "porque
  é mais idiomático" se o resto do projeto não usa isso.

## Adicionando uma tabela nova no banco

1. `npm run db:mig:new nome_da_migration`.
2. Crie a tabela, habilite RLS (`alter table ... enable row level security`).
3. **Não esqueça o GRANT** — é o bug mais repetido da história deste projeto (arquivo 09).
   RLS sem GRANT falha silenciosamente com "permission denied" antes de avaliar a policy.
4. Escreva as policies usando `current_user_role()` se a tabela tiver regra por papel — não
   invente uma checagem de autorização paralela.
5. Se a tabela guarda um segredo (chave de API, token), use GRANT de coluna para restringir
   leitura/escrita das colunas sensíveis a `service_role` só — nunca deixe `authenticated`
   ler de volta um segredo, mesmo que só admin use a tela (padrão em `asaas_settings`/
   `melhor_envio_settings`, arquivo 07).
6. Se alguma regra de negócio precisa ser inviolável (não só "recomendada"), coloque-a numa
   function `security definer`, não confie em RLS/GRANT sozinhos para isso (arquivo 07).
7. Depois de aplicar (`npm run db:push`), rode `npm run gen:types` — sem isso o TypeScript
   não sabe da tabela nova.
8. Se for tocar essa tabela de uma Edge Function com `service_role`, confirme GRANT explícito
   para `service_role` também — não é bypass automático neste projeto (arquivo 04/07/09).

## Adicionando/alterando uma function `security definer`

- Se está só adicionando `default` a um parâmetro que já existia (mesmo tipo), `create or
replace function` substitui normalmente.
- Se está adicionando um parâmetro **novo** (mudando a lista de tipos da assinatura), você
  precisa de `drop function if exists nome(<assinatura antiga exata>)` **antes** do `create or
replace` — senão o Postgres cria uma segunda function sobrecarregada e a versão antiga
  (sem sua validação nova) continua chamável. Teste depois chamando no formato antigo para
  confirmar que resolve para a versão nova. Detalhe completo no arquivo 04.
- Se a function usa `RETURNS TABLE (id uuid, ...)` ou qualquer nome de coluna comum, qualifique
  toda referência a essa coluna dentro do corpo (`tabela.id = ...`) — evita ambiguidade
  silenciosa que só aparece em runtime.

## Adicionando uma Edge Function nova

1. `supabase/functions/<nome>/index.ts`. Siga o padrão de `createCallerClient`/
   `createServiceClient` já usado nas existentes — não invente uma forma nova de autenticar.
2. Se recebe webhook de terceiro (sem JWT de usuário Supabase), valide a autenticidade —
   prefira HMAC (padrão da Melhor Envio) em vez de token estático comparado direto (padrão
   da Asaas, que é uma fraqueza conhecida, não um modelo a copiar — ver arquivo 07).
3. Adicione o script `fn:deploy:<nome>` no `package.json`, seguindo os existentes — inclua
   `--no-verify-jwt` só se for realmente um endpoint sem JWT de usuário.
4. Lembre: deploy de Edge Function **não é automático** no push para `main` — precisa rodar
   `npm run fn:deploy:<nome>` manualmente (arquivo 10).
5. Se toca dado sensível (pagamento, PII), registre a chamada em `integration_logs` seguindo
   o padrão de resumo allowlist — nunca logue o body cru ou dado de cartão/token.

## Adicionando uma integração externa nova (novo gateway, novo serviço de terceiro)

Use `melhor_envio_settings`/`asaas_settings` como modelo:

1. Tabela singleton própria para config + segredos, com GRANT de coluna separando o que
   `authenticated` pode ver (config pública) do que só `service_role` vê (segredo real).
2. Function `security definer` que devolve só `boolean` de "está configurado", para a UI
   nunca precisar reler o segredo.
3. Toda chamada à API externa passa por Edge Function — nunca direto do frontend com o
   segredo exposto no bundle.
4. Log de toda chamada em `integration_logs`, com resumo allowlist.
5. Se a integração envia webhook, valide HMAC — não repita a fraqueza do webhook da Asaas.
6. Documente o novo operador em `docs/lgpd/operadores.md` se ele processar dado pessoal —
   é uma obrigação legal (LGPD art. 37-39), não só boa prática.

## Ao fazer qualquer mudança em `create_order()` ou `delete_order()`

Estas duas functions são as mais sensíveis do projeto (dinheiro e integridade de pedido).
Releia o arquivo 04 inteiro antes de mexer, e teste explicitamente o caminho de falha (não
só o caminho feliz) — o histórico deste projeto tem mais de um bug real que só apareceu
testando o caminho de erro (arquivo 09).

## Antes de considerar algo "pronto"

- `npx tsc -b --noEmit` e `npx eslint . --cache` limpos.
- Testado no navegador de verdade — não há staging, então "testado" aqui significa testado
  contra o banco de produção real (ver aviso crítico #1 no README). Tenha isso em mente ao
  decidir o que testar e como limpar depois.
- Se mudou schema: `gen:types` rodado, `database.types.ts` commitado junto.
- Se mudou Edge Function: deploy manual feito.
- Se a mudança tem qualquer relação com dado pessoal (cadastro, pagamento, endereço,
  cookie/analytics), considere se `docs/lgpd/plano-adequacao.md` precisa ser atualizado.
