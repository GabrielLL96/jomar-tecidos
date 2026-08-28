# 8. Evolução histórica do projeto

Reconstruído a partir do `git log` real (72 commits, 2026-08-01 a 2026-08-15). **Este arquivo
explica como o projeto chegou ao estado atual — não é um roteiro para reproduzir passo a
passo.** Várias coisas construídas ao longo do caminho foram revertidas ou substituídas; segui-las
literalmente na ordem em que aconteceram levaria a reconstruir código que já não existe.
Para o estado atual, use os arquivos 01-06.

## Fase 1 — Scaffold institucional (2026-08-01)

Landing page institucional pura, sem loja funcional. Setup do projeto, README inicial, texto
da página Sobre, primeiro fix de header sticky, logo real.

## Fase 2 — Conta, Auth real e catálogo Supabase (2026-08-03 a 2026-08-05)

Reestruturação de "Minha Conta" alinhada ao schema do Supabase. Login/cadastro passam a usar
Supabase Auth **real** (não é mais mock desde este ponto). Primeiro painel admin (Dashboard +
Produtos). Catálogo, endereços, cupons e avaliações migram do fixture local para o Supabase
real — fim do catálogo mockado.

## Fase 3 — Admin de catálogo/estoque maduro (2026-08-06)

O dia mais denso do projeto (~13 commits). Storage de imagens real, configuração editável da
Home, edição/inativação de produto, reorganização do modal de produto em abas, hardening de
RLS (produto `draft` deixa de ser legível publicamente), responsividade do admin, CRUD de
composições (**redesenhado, depois revertido para uma versão mais simples fiel ao mockup
original — busca/cor/reordenação/lista expansível que existiram nesse meio-tempo não existem
mais no código atual**), tela de estoque, tela de usuários. Fecha com o marco do dia: pedidos
passam a ser reais no Supabase e nasce a tela `/admin/vendas` — fim do checkout 100%
simulado.

## Fase 4 — Checkout transacional e Melhor Envio (2026-08-07 a 2026-08-10)

Tela de detalhe de pedido. Marco estrutural: checkout inteiro migra para dentro da function
`create_order()` (`security definer`), atômico — fecha a possibilidade de pedido órfão por
falha no meio de uma sequência de inserts separados, e fecha uma vulnerabilidade real de
preço adulterável (`unit_price` deixa de vir do client). Integração com Melhor Envio
(cotação real de frete), telas de Entregas/Relatórios/Cupons, esqueci-minha-senha via
Supabase Auth, HTTPS local confiável. Segredo (`client_secret`) da Melhor Envio deixa de
aparecer na UI — só um indicador "Configurado" (mesmo padrão reaplicado depois na Asaas).

## Fase 5 — Debugging real do OAuth Melhor Envio + performance (2026-08-12)

Marco de performance: code-splitting por rota, fix de LCP no hero, compressão de imagem no
upload, skeleton na Home. O resto do dia foi uma sequência real de debugging em produção do
fluxo OAuth: troca de redirect de página inteira para popup, fix de nome de janela único
(colisão cross-tab), diagnóstico com log temporário, fix de mismatch de `state` CSRF,
mudança de "resultado via modal" para "mensagem inline" (o modal foi tentado e revertido no
mesmo dia), fixes de layout do admin (sessão de auth remontando o painel inteiro, sidebar
fixa). Fecha validando a cotação de frete real funcionando ponta a ponta em produção.

## Fase 6 — Cadastro completo, papéis, cupons robustos (2026-08-13)

Checkout passa a exigir login. Cadastro passa a coletar CPF/telefone/endereço — pré-requisito
direto para a cobrança real da Asaas, que exige CPF do titular. Regras de cupom corrigidas
(teto de desconto, fuso da expiração, status recalculado no servidor). Criação de usuário
admin/comum via Edge Function. Fecha com a **Fase 1 da integração Asaas**: conexão sandbox
em `/admin/configuracoes` — só armazenamento/validação de API key, ainda sem cobrança real.

## Fase 7 — Asaas Fase 2: pagamento real ponta a ponta (2026-08-14)

Checkout com cobrança real + webhook + reembolso. Fix crítico no mesmo dia: `create_order()`
sempre gravava o pedido como `'paid'` na criação (resquício de quando o checkout era
simulado) — corrigido para nascer `'pending'` sempre, com `paid` só acontecendo via webhook
ou ação explícita (ver arquivo 09 para o relato completo do bug). Parcelamento em até 3x sem
juros. Validação server-side da taxa fixa de frete. Cobrança direta com cartão via
tokenização passa a ser o fluxo predominante (reabrindo escopo PCI-DSS, ver arquivo 07).

## Fase 8 — SEO + LGPD/Consentimento (2026-08-14, tarde/noite)

Infraestrutura de SEO completa (meta tags, `robots.txt`, `sitemap.xml`, JSON-LD, Open Graph
server-side via Cloudflare Pages Function). Google Tag Manager com banner de consentimento
LGPD nasce **binário** (aceitar/recusar tudo) neste momento — vira granular só na fase
seguinte. Política de Privacidade construída incrementalmente ao longo de 6 commits
(estrutura em rascunho/noindex → dados da empresa → DPO/canal de contato → sai do rascunho →
correções de escopo).

## Fase 9 — Auditoria LGPD, adequação técnica, logs, polish final (2026-08-15)

Fix de favicon (marca real, não mais ícone genérico). **Auditoria LGPD/ANPD completa**
(~150 itens, ver `docs/lgpd/auditoria-2026-08-15.md`) — achados incluem a ausência de
staging (ver aviso crítico #1 no README), zero rate limit no endpoint de cobrança de
cartão, e os direitos do titular (acesso/eliminação/portabilidade) sem nenhuma implementação
técnica até então. Resposta técnica aos itens de Prioridade Alta/Média
(`docs/lgpd/plano-adequacao.md`): rate limiting, consentimento granular (com
"Personalizar"), registro de operadores, exclusão de conta self-service. Sistema de logs
(auditoria/erros/integrações) construído nesse dia — expande `activity_logs` (que já
existia desde o schema inicial mas nunca tinha sido usada como auditoria de verdade) e cria
`error_logs`/`integration_logs` do zero. Commit mais recente: troca de endereço padrão do
cliente com trigger de unicidade no banco.

## O que isso significa para manutenção

Se você encontrar um comentário, uma coluna nullable sem uso aparente, ou um padrão que
parece "estranho" — antes de assumir que é dívida técnica ou erro, procure se há uma decisão
registrada no arquivo 07 ou um bug documentado no arquivo 09 explicando por quê. Boa parte do
que parece incomum neste projeto foi endurecido em cima de um problema real encontrado
testando em produção (não há staging, lembra do aviso crítico #1 — testar em produção _é_ o
processo de teste deste projeto até hoje).
