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

Catálogo, carrinho, checkout, favoritos e login são **mockados localmente** (sem backend) — decisão registrada nos ADRs do projeto. Roteamento usa rotas reais do React Router (não state interno). Pagamento real (gateway Pix/cartão/boleto) está fora de escopo desta fase; o checkout apenas simula a confirmação do pedido.

## Como rodar

```bash
npm install
cp .env.example .env   # preencher VITE_PUBLIC_CRYPTO_KEY
npm run dev            # servidor de desenvolvimento
```

### Scripts

| Comando           | Descrição                          |
| ----------------- | ----------------------------------- |
| `npm run dev`      | Servidor de desenvolvimento (Vite) |
| `npm run build`    | Type-check (`tsc -b`) + build de produção |
| `npm run preview`  | Preview local do build de produção |
| `npm run lint`     | ESLint                             |
| `npm run format`   | Prettier (`--write`)               |

### Variáveis de ambiente

| Variável                  | Descrição                                                              |
| -------------------------- | ------------------------------------------------------------------------ |
| `VITE_API_URL`              | Base URL da API (não utilizada nesta fase — catálogo é mockado)         |
| `VITE_PUBLIC_CRYPTO_KEY`    | Chave de criptografia do `useSecureStorage`. Sem ela, o hook salva sem criptografia (fallback seguro) |

## Estrutura de pastas

```
src/
  components/
    ui/        # componentes shadcn/ui
    layout/    # Header, Footer, UtilityBar, RootLayout
    common/    # componentes utilitários (ImagePlaceholder, ícones)
  features/
    catalog/   # dados mock, hooks (TanStack Query), tipos do catálogo
    cart/      # contexto do carrinho
    favorites/ # contexto de favoritos
    auth/      # contexto de autenticação mockada
  pages/       # páginas roteadas
  hooks/       # useSecureStorage e demais hooks globais
  lib/         # axios, query-client, constants, format, utils
```
