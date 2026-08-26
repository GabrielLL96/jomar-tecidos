# 1. Setup do ambiente

## Pré-requisitos

- Node.js (versão compatível com Vite 8 e React 19 — use uma LTS recente)
- Uma conta com acesso ao projeto Supabase real (`ooghhxcrdndulzlrsliz`, região `sa-east-1`)
  — não existe projeto Supabase de teste separado (ver aviso crítico #1 no [README](./README.md))
- Git

## Instalação

```bash
git clone <repo>
cd Jomartecidos
npm install
```

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```
VITE_PUBLIC_CRYPTO_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

| Variável | Para que serve | Onde é usada |
|---|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase | `src/lib/supabase.ts`; também usada para montar a URL de webhook mostrada nas telas de integração (`AsaasIntegrationCard.tsx`, `MelhorEnvioIntegrationCard.tsx`) |
| `VITE_SUPABASE_ANON_KEY` | Chave pública (anon) do Supabase — segura para expor no bundle, nunca usar a `service_role` aqui | `src/lib/supabase.ts` |
| `VITE_PUBLIC_CRYPTO_KEY` | Chave AES usada para criptografar dados sensíveis salvos localmente (sessão em cookie, favoritos) | `src/lib/secureStorage.ts` — **sem essa chave, o app funciona mas salva sem criptografia** (fallback silencioso, não trava) |

Duas variáveis adicionais são necessárias só para rodar **scripts de CLI** (não são lidas
pelo app em runtime, então não têm o prefixo obrigatório de app, mas precisam estar no
mesmo `.env` porque os scripts usam `dotenv-cli` para injetá-las):

| Variável | Usada por |
|---|---|
| `VITE_SUPABASE_PROJECT_ID` | `npm run gen:types` (regenerar tipos TS a partir do schema real) |
| `SUPABASE_ACCESS_TOKEN` | `npm run sb:login` (autenticar o Supabase CLI local) |

Peça esses valores a quem já tem acesso ao projeto — não estão documentados aqui de
propósito (são credenciais).

Existe também `VITE_API_URL`, referenciada em `src/lib/axios.ts` com fallback para
`http://localhost:3000/api` — não está em `.env.example` porque não há um backend HTTP
próprio rodando nessa URL atualmente (o projeto usa Supabase diretamente, não uma API REST
intermediária); o axios configurado existe mas não é o caminho principal de dados do app.

## Rodando localmente

```bash
npm run dev
```

Sobe em HTTPS local (via `vite-plugin-mkcert`, que instala uma CA confiável no truststore do
Windows na primeira execução — diferente de um certificado autoassinado, o navegador não
mostra aviso de "não seguro"). Veja **por que HTTPS é necessário mesmo em dev** em
[07-decisoes-arquiteturais.md](./07-decisoes-arquiteturais.md) (o fluxo OAuth da Melhor Envio
e cookies `Secure` de sessão dependem disso).

**Lembrete**: isso conecta no banco de produção real. Ver aviso crítico #1 no README.

## Scripts disponíveis (`package.json`)

| Script | O que faz | Observação |
|---|---|---|
| `dev` | `vite` — dev server | |
| `build` | `format && type-check && lint && vite build` | ⚠️ **`format` reescreve arquivos no disco** (`prettier --write .`, sem escopo — reformata o repo inteiro, não só o que você tocou). Rodar `npm run build` numa árvore com arquivos não formatados de sessões anteriores vai gerar diffs cosméticos misturados no seu trabalho. Ver [09-erros-problemas-conhecidos.md](./09-erros-problemas-conhecidos.md). |
| `build:dev` | `vite build --mode development` | Build sem a cadeia de format/type-check/lint — mais rápido para verificar bundle sem reformatar nada |
| `type-check` | `tsc -b --noEmit` | O `-b` (build mode) é obrigatório — `tsc --noEmit` sozinho, sem `-b`, ignora silenciosamente as `references` do `tsconfig.json` raiz e não checa nada de verdade (armadilha real já documentada no histórico do projeto) |
| `lint` / `lint:fix` | `eslint . --cache` (com `--fix` opcional) | |
| `format` / `format:check` | `prettier --write .` / `prettier --check .` | Use `format:check` quando só quiser saber se está formatado, sem reescrever |
| `preview` | `vite preview` | Serve o build de produção localmente |
| `gen:types` | Regenera `src/lib/database.types.ts` a partir do schema Postgres real | Requer `VITE_SUPABASE_PROJECT_ID` |
| `db:mig:new` | `supabase migration new <nome>` | Cria arquivo de migration novo em `supabase/migrations/` |
| `db:diff` | Gera diff de schema com nome de arquivo timestamped | |
| `db:push` | Aplica migrations pendentes no projeto remoto | Aplica direto em produção — não há ambiente intermediário |
| `db:studio` | Abre o Supabase Studio local | |
| `sb:login` | Autentica o Supabase CLI | Requer `SUPABASE_ACCESS_TOKEN` |
| `sb:link` | `supabase link --project-ref` | Script incompleto de propósito — falta o valor do ref como argumento; rode como `npm run sb:link -- <ref>` |
| `fn:deploy:<nome>` (10 scripts) | Deploy de uma Edge Function específica | Ver lista completa em [06-integracoes-externas.md](./06-integracoes-externas.md) — as que recebem webhook externo (`meta-catalog-feed`, `melhor-envio-webhook`, `asaas-webhook`) usam `--no-verify-jwt` porque não chegam com JWT de usuário Supabase |
| `fn:deploy:all` | Deploy de todas as Edge Functions de uma vez | |

## Verificação rápida de que está tudo certo

```bash
npx tsc -b --noEmit   # type-check sem reformatar nada
npx eslint . --cache  # lint sem reformatar nada
```

Prefira essas duas chamadas diretas em vez de `npm run build`/`npm run format` durante
desenvolvimento normal — evita o efeito colateral de reformatação em massa. Reserve
`npm run build` para quando você realmente for revisar/commitar o diff completo do repo.
