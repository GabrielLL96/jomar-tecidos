# Guia Técnico de Onboarding — Jomar Tecidos

Manual de referência para um desenvolvedor entrando no projeto agora. Cobre arquitetura,
decisões técnicas, configuração, integrações e procedimentos de manutenção — construído a
partir do código real (migrations, Edge Functions, `git log` de 72 commits), não de memória
ou suposição.

**Como usar**: leia os avisos críticos abaixo primeiro, sempre. Depois siga a ordem dos
arquivos — cada um pressupõe o anterior.

## ⚠️ Avisos críticos — leia antes de tocar em qualquer coisa

### 1. Não existe ambiente de staging. Dev local aponta pro banco de produção real.
O `.env` local usa o mesmo projeto Supabase (`ooghhxcrdndulzlrsliz`) que roda em produção em
`jomartecidos.com.br`. Não há um segundo projeto Supabase para testes. Isso já causou dano
real: durante o desenvolvimento da integração de pagamento, pedidos de teste foram criados
no banco de produção e precisaram ser apagados manualmente (ver
[08-evolucao-historica.md](./08-evolucao-historica.md) e `docs/lgpd/auditoria-2026-08-15.md`).

**Na prática, isso significa:**
- Qualquer checkout testado localmente cria um pedido **real** na tabela `orders` de produção.
- Se a Asaas estiver configurada em modo `production` (`asaas_settings.environment`), uma
  cobrança de cartão testada localmente **cobra o cartão de verdade**. Confirme o ambiente
  configurado antes de testar checkout com pagamento (ver
  [06-integracoes-externas.md](./06-integracoes-externas.md)).
- Qualquer `git push` para `main` é deploy automático em produção via Cloudflare Pages
  (~2 min de propagação) — não é só "atualiza o ambiente de dev de alguém".
- Ações de teste no admin (criar/editar/excluir produto, usuário, cupom) afetam dado real
  visto por clientes reais.

Isso está registrado como item de Prioridade Alta pendente em `docs/lgpd/plano-adequacao.md`
— não foi esquecido, é uma decisão consciente ainda não revertida. Trate qualquer ação de
teste com a mesma cautela que teria em produção, porque é produção.

### 2. Webhook da Asaas usa token estático, não HMAC
`supabase/functions/asaas-webhook/index.ts` autentica comparando um token fixo
(`asaas_settings.webhook_token`) direto contra o header `asaas-access-token`. O webhook da
Melhor Envio, em contraste, valida uma assinatura HMAC-SHA256 real. Se o `webhook_token`
vazar (log acidental, captura de tela, etc.), qualquer requisição com esse token consegue
forjar confirmação de pagamento ou reembolso. É uma limitação conhecida do modelo de
segurança atual — ver [06-integracoes-externas.md](./06-integracoes-externas.md).

### 3. Cobrança com cartão de crédito passa dado de cartão pela nossa infraestrutura
O fluxo atual (`asaas-charge-card`) recebe número/validade/CVV no frontend e envia para uma
Edge Function, que repassa para a Asaas. O dado nunca é persistido, mas **transita** pela
nossa Edge Function — isso coloca esse código path em escopo de PCI-DSS. A alternativa mais
segura (widget de tokenização hospedado pela própria Asaas, que nunca toca nossa
infraestrutura) foi preterida em favor de um checkout de página única. Ver
[07-decisoes-arquiteturais.md](./07-decisoes-arquiteturais.md) para o raciocínio completo —
isto é documentado como trade-off consciente, não como bug, mas qualquer manutenção nesse
código deve entender a implicação antes de mexer.

---

## Índice

1. [01-setup-ambiente.md](./01-setup-ambiente.md) — instalação, variáveis de ambiente, scripts, primeiro `npm run dev`
2. [02-arquitetura-projeto.md](./02-arquitetura-projeto.md) — estrutura de pastas, convenções de código, tooling (TS/ESLint/Prettier/shadcn)
3. [03-frontend-funcionalidades.md](./03-frontend-funcionalidades.md) — rotas, features, fluxos de UI (loja + admin)
4. [04-banco-de-dados.md](./04-banco-de-dados.md) — modelagem, RLS, migrations, functions críticas
5. [05-autenticacao-autorizacao.md](./05-autenticacao-autorizacao.md) — login, sessão, papéis, gate do admin
6. [06-integracoes-externas.md](./06-integracoes-externas.md) — Asaas (pagamento), Melhor Envio (frete), GTM/consentimento
7. [07-decisoes-arquiteturais.md](./07-decisoes-arquiteturais.md) — por que o projeto é como é, trade-offs assumidos
8. [08-evolucao-historica.md](./08-evolucao-historica.md) — como o projeto chegou aqui, por fase, via `git log`
9. [09-erros-problemas-conhecidos.md](./09-erros-problemas-conhecidos.md) — bugs reais já encontrados e como foram corrigidos
10. [10-deploy-ambientes.md](./10-deploy-ambientes.md) — dev vs. produção, deploy, variáveis por ambiente
11. [11-manutencao-evolucao.md](./11-manutencao-evolucao.md) — como adicionar uma feature nova sem quebrar os padrões existentes
12. [12-glossario.md](./12-glossario.md) — termos de domínio e de negócio

## O que este guia não é

Este guia **não é um roteiro de "faça isso, depois isso"** para reconstruir o projeto do
zero seguindo a ordem histórica literal. O histórico real (arquivo 08) tem reversões — um
redesign inteiro da tela de Composições foi revertido, o checkout começou mockado e depois
foi trocado por dado real duas vezes (catálogo, depois pedidos), a tela de resultado de
conexão OAuth mudou de formato 3 vezes na mesma sessão. Seguir a cronologia como receita
levaria a construir coisas que já não existem mais no código atual. Os arquivos 01-07
descrevem **o estado atual** (o que existe e como usar); o arquivo 08 existe para explicar
**por que** o estado atual é o que é, não para ser reproduzido passo a passo.
