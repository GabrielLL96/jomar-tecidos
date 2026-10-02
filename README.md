# Jomar Tecidos e Enxovais

Landing page / e-commerce da **Jomar Tecidos e Enxovais** (Pouso Alegre, MG, desde 1987) — catálogo de tecidos nobres, aviamentos e enxovais, carrinho, checkout e conta de cliente.

## Stack

- [Vite](https://vite.dev/) + [React 19](https://react.dev/) + TypeScript (strict)
- [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (estilo `radix-nova`, ícones [Lucide](https://lucide.dev/))
- [React Router](https://reactrouter.com/) v7
- [TanStack Query](https://tanstack.com/query) v5
- [Axios](https://axios-http.com/)
- [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- [Motion](https://motion.dev/) (Framer Motion)
- `useSecureStorage` — hook próprio que criptografa dados salvos no `localStorage` (AES via `crypto-js`)

## Escopo atual

Backend real em **Supabase** (Postgres + RLS + Edge Functions): catálogo, carrinho, favoritos, login/conta, pedidos e painel admin. O checkout cria o pedido pela RPC `create_order` (`security definer`) — preços, frete e cupom são recalculados no servidor, o client não dita valores. Pagamento real via **Asaas** (Pix, boleto e cartão; edge functions `asaas-*`), frete via **Melhor Envio** (hoje em sandbox) e e-mail transacional via **Resend**. Roteamento usa rotas reais do React Router (não state interno).

## Como rodar

```bash
npm install
cp .env.example .env   # preencher as variáveis (ver tabela abaixo)
npm run dev            # servidor de desenvolvimento
```

### Scripts

| Comando           | Descrição                                 |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Servidor de desenvolvimento (Vite)        |
| `npm run build`   | Type-check (`tsc -b`) + build de produção |
| `npm run preview` | Preview local do build de produção        |
| `npm run lint`    | ESLint                                    |
| `npm run format`  | Prettier (`--write`)                      |

### Variáveis de ambiente

| Variável                   | Descrição                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`        | URL do projeto Supabase                                                                               |
| `VITE_SUPABASE_ANON_KEY`   | Chave anon (pública) do Supabase — o acesso a dados é protegido por RLS                               |
| `VITE_SUPABASE_PROJECT_ID` | ID do projeto Supabase (usado pelos scripts de CLI/types)                                             |
| `VITE_PUBLIC_CRYPTO_KEY`   | Chave de criptografia do `useSecureStorage`. Sem ela, o hook salva sem criptografia (fallback seguro) |
| `SUPABASE_ACCESS_TOKEN`    | Só scripts da CLI do Supabase (`sb:login`/`sb:link`) — não é lida pelo Vite                           |
| `RESEND_SMTP_PASSWORD`     | Só `config:push` (SMTP do Auth via Resend) — não é lida pelo Vite                                     |

Segredos de Melhor Envio, Asaas e Resend ficam no banco/secrets das edge functions, nunca no `.env` do front.

## Estrutura de pastas

```
src/
  components/
    ui/        # componentes shadcn/ui
    layout/    # Header, Footer, UtilityBar, RootLayout
    common/    # componentes utilitários (ImagePlaceholder, ícones)
  features/
    catalog/   # hooks (TanStack Query), tipos do catálogo
    cart/      # contexto do carrinho
    favorites/ # contexto de favoritos
    auth/      # contexto de autenticação (Supabase Auth)
  pages/       # páginas roteadas
  hooks/       # useSecureStorage e demais hooks globais
  lib/         # axios, query-client, constants, format, utils
```
