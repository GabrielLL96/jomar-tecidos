# 5. Autenticação e autorização

## Onde vive

`src/features/auth/AuthContext.tsx` (não em `src/contexts/` — atenção se for procurar por
convenção de outro projeto). Consome Supabase Auth real — não é mock.

## Login e sessão

- Login: `supabase.auth.signInWithPassword({ email, password })`. Em caso de sucesso, dispara
  (best-effort, sem bloquear o login se falhar) um `update` de `users.last_login_at`, busca o
  perfil completo (`id, name, email, phone, role` de `public.users`) e devolve para o
  chamador decidir o redirect.
- Sessão persistida em **cookies criptografados** (`secureCookieStorage`), não
  `localStorage` puro — ver detalhe em
  [04-banco-de-dados.md](./04-banco-de-dados.md#client-supabase-no-frontend-srclibsupabasets).
  `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true` (necessário
  para o link de "esqueci minha senha" funcionar).
- Estado do usuário é mantido via `supabase.auth.onAuthStateChange`.
- Em evento `'SIGNED_IN'` real (não em refresh de token), chama a RPC `log_login()` para
  auditoria.
- Logout: chama a RPC `log_logout()` **antes** de `signOut()` — a RPC é `security definer` e
  depende do JWT ainda estar válido; se a ordem for invertida, o log de logout nunca
  registra quem saiu.
- `role` vem tipado do enum Postgres `user_role` (via `database.types.ts`, gerado
  automaticamente — não redigite esse tipo manualmente).

## Armadilha de auth que já mordeu o projeto uma vez: `isLoading` piscando desmonta o admin inteiro

Um padrão comum de route guard é `if (isLoading || !user) return null`. O problema real
encontrado neste projeto: bibliotecas de auth com refresh automático de token (Supabase
`GoTrueClient`) disparam o listener `onAuthStateChange` de novo a cada `TOKEN_REFRESHED` —
que costuma acontecer sempre que a aba/janela recupera o foco, não só no carregamento
inicial. Se o `isLoading` for setado como `true` **incondicionalmente** a cada disparo desse
evento (não só na checagem inicial), toda troca de foco da janela desmonta e remonta a
árvore inteira do painel admin — destruindo qualquer `useRef`/state local de qualquer
componente filho, sem nenhum erro visível.

Isso já causou um bug real e difícil de diagnosticar: o fluxo de conexão OAuth com a Melhor
Envio (que abre um popup — abrir/fechar popup é justamente um ciclo garantido de perda e
ganho de foco) perdia o `state` de CSRF guardado em `useRef` bem na hora que a resposta
chegava, porque o layout tinha acabado de remontar por baixo. **Fix aplicado**:
`AuthContext.tsx` só liga `isLoading` na checagem **inicial** da sessão — eventos de auth
subsequentes (refresh em background) atualizam só o `user`, nunca tocam `isLoading`.

Se você for depurar "state local do admin sumindo depois de trocar de aba e voltar", esse
padrão é o suspeito número um — confirme antes de investigar o fluxo específico que expôs o
sintoma.

## Gate de acesso ao `/admin/*`

Único ponto de proteção, dentro de `AdminLayout.tsx` (não há `ProtectedRoute` por rota
individual):

```tsx
useEffect(() => {
  if (isLoading) return
  if (!user) {
    navigate('/conta/entrar', { replace: true })
    return
  }
  if (user.role !== 'admin') {
    navigate('/', { replace: true })
  }
}, [user, isLoading, navigate])

if (isLoading || !user || user.role !== 'admin') return null
```

Ou seja: literalmente `user.role !== 'admin'`. **Não há checagem granular por seção do
painel** — um usuário `vendas`/`estoque`/`marketing`/`suporte` (todos valores válidos do
enum `role`, e alguns já usados em RLS policies de escrita no banco) não consegue abrir
**nenhuma** tela do admin hoje, mesmo tendo permissão de escrita em produtos/estoque no
nível do banco. Isso é um gap conhecido e aceito, não um bug — ver
[07-decisoes-arquiteturais.md](./07-decisoes-arquiteturais.md).

Enquanto a sessão carrega, ou se o usuário não está logado, ou está logado mas não é admin,
o componente renderiza `null` (sem flash de conteúdo do admin) e dispara o redirect
apropriado.

## Criação de usuário admin

Não existe fluxo client-side para promover alguém a admin — `public.users.id` é FK para
`auth.users.id`, e criar a conta de autenticação exige a Admin API do Supabase
(`service_role`), que **nunca pode rodar no navegador**. O caminho real é a Edge Function
`admin-create-user` (chamável só por quem já é admin): cria a conta via Admin API e, se
`role: 'admin'` foi pedido, faz um `UPDATE` explícito em `public.users.role` **depois** de
confirmar que a criação teve sucesso — nunca tenta setar o role dentro do trigger
`handle_new_user()` (uma tentativa anterior nesse sentido foi revertida, ver arquivo 04).

## Redefinição de senha

Fluxo real via Supabase Auth (`resetPasswordForEmail`/`updateUser`) — não é senha mockada.
`admin-set-password` (Edge Function) permite que um admin defina senha diretamente só para
contas de **staff** (nunca para `customer` — bloqueio explícito lendo o `role` antes de agir).
