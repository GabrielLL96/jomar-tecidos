# Auditoria LGPD/ANPD — Jomartecidos — 2026-08-15

Auditoria feita seguindo `skills/lgpd-compliance.md` (vault Obsidian). Cada item foi verificado contra o código/schema real do projeto — não é uma checagem genérica, é ponto a ponto com evidência (arquivo/linha) quando aplicável.

Legenda: ✅ Atende · ⚠️ Parcial · ❌ Não atende · 🔲 Não mapeado / requer decisão de negócio ou jurídica

## Etapa 1 — Mapeamento do projeto

| Item                          | Valor                                                                                                                                                                                                                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tipo de software              | E-commerce B2C (loja de tecidos), SPA React + Supabase                                                                                                                                                                                                                                   |
| Dados coletados               | Cadastro: nome, e-mail, CPF, telefone, endereço. Pedido: itens, endereço de entrega. Pagamento: cartão transita direto pro processador (Asaas), nunca persiste no nosso banco — só token quando cliente opta por salvar. Navegação: cookies/analytics via GTM/GA4, só com consentimento. |
| Stack                         | Vite + React 19 + TS (frontend), Supabase — Postgres 17 + Auth + Storage + Edge Functions (Deno) — (backend), Cloudflare Pages (hospedagem)                                                                                                                                              |
| Integrações externas          | Asaas (pagamento), Melhor Envio (frete), Google Analytics/Tag Manager (métricas, com consentimento)                                                                                                                                                                                      |
| Autenticação                  | Supabase Auth (GoTrue), e-mail/senha                                                                                                                                                                                                                                                     |
| Localização dos servidores    | Supabase: `sa-east-1` (São Paulo) — confirmado via `supabase projects list`. Cloudflare Pages: CDN global (só assets estáticos/HTML, sem dado pessoal em repouso)                                                                                                                        |
| Backups                       | Gerenciados pelo Supabase — política de retenção/frequência não auditada nesta rodada (depende do plano contratado, não visível via código)                                                                                                                                              |
| Documentos legais             | Política de Privacidade existe e é real (`/politica-de-privacidade`, desde 2026-08-15). Termos de Uso, Política de Segurança, Formas de Entrega, Trocas e Devoluções: **texto decorativo no rodapé, sem página nenhuma por trás** (`Footer.tsx`, `inertLinkClass`)                       |
| Processo de exclusão de dados | **Não existe** — nenhuma feature de "excluir minha conta" em `AccountDataPage.tsx` nem em nenhum outro lugar                                                                                                                                                                             |
| DPO designado                 | Não, por decisão do usuário — política cita a Resolução CD/ANPD nº 2/2022 (agentes de pequeno porte) como amparo. **Ver ressalva na seção DPO abaixo — essa leitura não foi confirmada juridicamente.**                                                                                  |

---

## Etapa 2 — Auditoria por categoria

### Documentos Legais

| Item                                             | Status | Evidência                                                                                                                                                           |
| ------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identidade e contato do controlador              | ✅     | Razão social, CNPJ, IE em `/politica-de-privacidade`                                                                                                                |
| Identidade e canal do DPO                        | ⚠️     | Declara explicitamente que não há DPO formal — ver seção DPO                                                                                                        |
| Finalidade específica por tratamento             | ✅     | Item 3 da política lista finalidades reais (não genéricas)                                                                                                          |
| Base legal por finalidade                        | ❌     | Política não cita a base legal (art. 7) de cada finalidade — ex.: marketing promocional está descrito mas sem dizer se a base é consentimento ou legítimo interesse |
| Quais dados são coletados                        | ✅     | Item 2                                                                                                                                                              |
| Prazo de retenção por tipo de dado               | ⚠️     | Item 7 cita as leis (LGPD, CTN, CDC) mas não traduz em prazo concreto por tipo de dado (ex.: "cadastro inativo é apagado após X anos")                              |
| Terceiros que recebem dados                      | ✅     | Item 4 — Asaas, Melhor Envio, Google, nominalmente                                                                                                                  |
| Como exercer os 9 direitos                       | ⚠️     | Cita canal (telefone/e-mail) mas não SLA nem processo — só 4 dos 9 direitos do art. 18 são mencionados explicitamente                                               |
| Data da última atualização                       | ✅     | 15 de agosto de 2026                                                                                                                                                |
| Notificação de mudanças materiais                | ⚠️     | Item 9 promete indicar mudança pela data, mas não há mecanismo de notificação ativa (e-mail) pro titular                                                            |
| **Termos de Uso separado**                       | ❌     | Não existe — só texto decorativo no rodapé                                                                                                                          |
| **Política de Cookies com categorias separadas** | ❌     | Banner de consentimento é binário (aceitar tudo / recusar tudo) — não separa "necessário" de "analítico" de "marketing"                                             |
| Cookie não-essencial só após consentimento       | ✅     | `GoogleTagManager.tsx` só injeta o script GTM se `consent === 'granted'` — testado ao vivo nesta sessão                                                             |

### Consentimento

| Item                                              | Status | Evidência                                                                                                                                         |
| ------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Livre, informado, específico por finalidade       | ❌     | Banner é "aceitar tudo ou nada" — LGPD exige granularidade por finalidade (analytics ≠ marketing ≠ essencial)                                     |
| Checkbox não pré-marcado                          | ✅     | Não há checkbox pré-marcado em lugar nenhum                                                                                                       |
| Registro de consentimento (timestamp, versão, IP) | ❌     | `ConsentContext.tsx` só grava `'granted'`/`'denied'` via `useSecureStorage` — sem timestamp, sem versão do documento, sem identificador           |
| Revogação tão fácil quanto aceite                 | ✅     | "Preferências de Cookies" no rodapé reabre o banner, `deny()` força reload pra parar tracking já ativo de verdade (não só remove o script do DOM) |
| Legítimo interesse documentado (LIA)              | 🔲     | Marketing promocional (item 3 da política) pode estar usando legítimo interesse sem LIA documentado — requer decisão de negócio                   |

### Direitos do Titular (art. 18)

| #   | Direito                                   | Status                                                                                                                  |
| --- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | Confirmação de tratamento                 | ⚠️ — só via contato manual, sem canal dedicado                                                                          |
| 2   | Acesso aos dados (formato estruturado)    | ❌ — não existe exportação de dados na área do cliente                                                                  |
| 3   | Correção                                  | ✅ — `AccountDataPage.tsx` permite editar nome/e-mail/telefone/senha                                                    |
| 4   | Anonimização/bloqueio/eliminação          | ❌ — sem processo nenhum                                                                                                |
| 5   | Portabilidade                             | ❌                                                                                                                      |
| 6   | Eliminação após revogação                 | ❌ — revogar consentimento de cookie funciona; revogar consentimento de CADASTRO (excluir conta) não tem caminho nenhum |
| 7   | Info sobre compartilhamento com terceiros | ✅ — item 4 da política                                                                                                 |
| 8   | Info sobre consequência de não consentir  | ⚠️ — banner diz "não afeta capacidade de comprar", mas não cobre todas as finalidades                                   |
| 9   | Revisão de decisão automatizada           | N/A — não há decisão automatizada com efeito significativo no titular (checkout não faz scoring/perfilamento)           |

**Achado mais grave da auditoria**: os direitos 2, 4, 5 e 6 (acesso estruturado, eliminação, portabilidade, eliminação pós-revogação) **não têm nenhuma implementação técnica** — hoje, um pedido desses só poderia ser atendido manualmente, direto no banco, por alguém com acesso ao Supabase.

### Segurança Técnica

| Item                                       | Status | Evidência                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTPS em todos os endpoints                | ✅     | Cloudflare Pages força HTTPS; Edge Functions só respondem via HTTPS                                                                                                                                                                                                                                                                 |
| Criptografia em trânsito                   | ✅     | HTTPS + Supabase client sempre TLS                                                                                                                                                                                                                                                                                                  |
| Criptografia em repouso (banco)            | 🔲     | Gerenciado pelo Supabase (AES-256 at rest é padrão da AWS RDS, mas não confirmado explicitamente pra este projeto)                                                                                                                                                                                                                  |
| Pseudonimização                            | ❌     | CPF/e-mail/telefone ficam em texto plano nas tabelas (`users`, `addresses`)                                                                                                                                                                                                                                                         |
| Controle de acesso por menor privilégio    | ✅     | RLS granular por papel (`admin`/`vendas`/`estoque`/`customer`) documentado em várias migrations — achado real desta auditoria: `service_role` neste projeto **não faz bypass automático de RLS/GRANT** (já documentado 6x no `_Feedback.md` do projeto), o que é incomum mas resultou em GRANT explícito revisado tabela por tabela |
| Logs de auditoria de acesso a dado pessoal | ⚠️     | Existe `activity_logs` (admin-only) e `stock_movements`/`order_status_history`, mas **não há log de LEITURA** de dado pessoal, só de escrita/ação administrativa                                                                                                                                                                    |
| Privacy by Design                          | ⚠️     | Minimização parcial — ex.: `getClientIp()` só usa o IP pro repasse obrigatório à Asaas, não persiste — mas retenção não tem prazo definido em lugar nenhum                                                                                                                                                                          |
| Política de retenção aplicada a backups    | ❌     | Não auditado/não definido — gap comum #5 do checklist, presente aqui também                                                                                                                                                                                                                                                         |

### Incidentes de Segurança

| Item                                         | Status                                          |
| -------------------------------------------- | ----------------------------------------------- |
| Processo de resposta a incidente documentado | ❌ — não existe nenhum runbook/processo escrito |
| Comunicação à ANPD em 72h                    | 🔲 — depende de existir processo primeiro       |

### DPO / Encarregado

⚠️ **Ressalva importante, achada nesta auditoria**: a Política de Privacidade (item 1) declara que a Jomar não designa encarregado formal, citando a Resolução CD/ANPD nº 2/2022. Essa decisão foi tomada numa sessão anterior **com essa mesma ressalva já feita** ("não é revisão jurídica formal"). Relendo agora com a skill de compliance: a Resolução 2/2022 dá **simplificações** para agentes de pequeno porte, mas o texto da própria skill (`DPO / Encarregado`) afirma que a designação é **"obrigatória para toda PJ que trata dados sistematicamente"**, sem citar exceção pra pequena empresa nessa seção específica. Ou seja, há uma tensão entre o que foi publicado na política e o que a skill (referência mais recente/estruturada) afirma. **Isso precisa de confirmação jurídica real antes de continuar confiando no texto atual da política** — não é algo que deva ser resolvido só no código.

### RIPD

| Item              | Status                                                                                                                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RIPD obrigatório? | ❌ Não aplicável pelos critérios listados (sem dado sensível, sem criança, sem perfilamento em larga escala, sem decisão automatizada de impacto, sem vigilância) — nenhum RIPD necessário hoje |

### Dados Sensíveis / Dados de Crianças

✅ N/A para os dois — a Jomar não coleta categoria sensível (saúde, biometria, etc.) nem opera serviço direcionado a criança/adolescente. Nenhuma ação necessária.

### Transferência Internacional

| Item                                      | Status |
| ----------------------------------------- | ------ |
| Mapeamento de transferência internacional | ⚠️     | **Achado real**: Google Analytics/Tag Manager processa dado (mesmo que só de navegação/cookie) em infraestrutura fora do Brasil — isso é transferência internacional de dado pessoal e não está tratado em lugar nenhum da política nem tecnicamente (sem cláusula contratual padrão, sem base legal específica citada) |
| Asaas / Melhor Envio                      | ✅     | Empresas brasileiras, processamento presumidamente doméstico (não verificado contrato/DPA)                                                                                                                                                                                                                              |
| Cloudflare (CDN)                          | 🔲     | CDN global — não processa dado pessoal em repouso (só serve assets estáticos + faz proxy de request), mas tecnicamente os pacotes de rede passam por edges fora do Brasil. Risco baixo, mas não documentado                                                                                                             |

### Terceiros / Operadores

| Item                      | Status |
| ------------------------- | ------ |
| DPA com cada operador     | 🔲     | Nenhum DPA foi revisado/confirmado nesta auditoria — Asaas, Melhor Envio e Google têm seus próprios termos, mas não há registro de due diligence formal |
| Registro de operadores    | ❌     | Não existe um documento tipo `docs/lgpd/operadores.md` (até esta auditoria)                                                                             |
| Mapeamento de integrações | ✅     | Feito nesta auditoria — 3 operadores reais (Asaas, Melhor Envio, Google)                                                                                |

### Retenção e Exclusão

| Item                                                      | Status               | Evidência                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Política de retenção documentada                          | ⚠️                   | Política cita as leis (5 anos fiscal/consumerista) mas não define prazo prático de cadastro inativo                                                                                                                                                                                                                               |
| **Soft delete não é exclusão válida — usado em `orders`** | ✅ (uso justificado) | `orders.deleted_at` é soft-delete **deliberado por obrigação fiscal** (registro de venda), exatamente uma das exceções que a própria skill lista ("obrigação legal/regulatória"). Não é gap, é a exceção prevista se aplicando corretamente — mas precisa continuar sendo tratado como exceção documentada, não como padrão geral |
| Exclusão de CONTA de usuário                              | ❌                   | Não existe. E tecnicamente, mesmo se existisse: `orders.user_id references public.users(id) on delete restrict` — um usuário com histórico de pedido **não pode ser excluído via cascade**, precisaria de estratégia de anonimização (zerar nome/CPF/telefone/endereço em vez de apagar a linha), que também não existe hoje      |
| Backup coberto pela política de exclusão                  | 🔲                   | Não auditável via código — depende de configuração do plano Supabase                                                                                                                                                                                                                                                              |

### Banco de Dados

| Item                                           | Status | Evidência                                                                                                                                                                                                                               |
| ---------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hash de senha (bcrypt/argon2)                  | ✅     | Delegado ao Supabase Auth (GoTrue) — nunca implementado à mão neste projeto, sem risco de MD5/SHA1/plaintext                                                                                                                            |
| CPF/e-mail/telefone pseudonimizados no banco   | ❌     | Texto plano em `public.users`/`public.addresses`                                                                                                                                                                                        |
| Dados sensíveis em tabela isolada              | N/A    | Sem dado sensível na aplicação                                                                                                                                                                                                          |
| Nunca armazenar dado de cartão                 | ✅     | Confirmado e testado nesta sessão — `saved_credit_cards` só grava token+últimos 4 dígitos+bandeira, nunca PAN/CVV                                                                                                                       |
| Mascaramento em ambientes não-produtivos       | ❌     | Dev local aponta pro **mesmo banco de produção** (confirmado ao longo de toda esta sessão — não existe banco de staging separado) — isso é uma violação direta do item "dado real de produção em ambiente compartilhado/dev é infração" |
| RLS (row-level security)                       | ✅     | Extensivamente usado, papel por papel, múltiplas correções documentadas no `_Feedback.md` do projeto                                                                                                                                    |
| Auditoria de writes em tabela com dado pessoal | ⚠️     | Existe pra pedido/estoque (`order_status_history`, `stock_movements`), não existe pra `users`/`addresses`                                                                                                                               |
| Credenciais via secrets manager                | ✅     | `.env` gitignored, chave pública (`sb_publishable_...`) é a única no bundle client, `service_role` nunca commitado                                                                                                                      |

### APIs e Endpoints

| Item                                      | Status                                                       |
| ----------------------------------------- | ------------------------------------------------------------ |
| Dado pessoal em query param de URL        | ✅ (não ocorre) — checkout/Edge Functions usam POST com body |
| Response retorna só campo necessário      | ✅                                                           | `.select()` explícito com campos nomeados em todas as queries verificadas, nunca `select('*')`                                                                                                                           |
| Rate limiting                             | ❌                                                           | **Nenhuma Edge Function tem rate limiting** — `asaas-charge-card` (cobra cartão!) pode ser chamada repetidamente sem limite, abrindo espaço pra teste de cartão em massa (card testing fraud) além do risco de LGPD puro |
| Paginação em listas de dado pessoal       | ⚠️                                                           | Admin (`AdminUsersPage`) carrega lista de usuários sem paginação — funciona hoje pelo volume baixo, mas escala mal                                                                                                       |
| Exportação exige autenticação forte + log | N/A                                                          | Não existe exportação                                                                                                                                                                                                    |

### Logs e Monitoramento

| Item                                           | Status | Evidência                                                                                                                                                                      |
| ---------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Logs de aplicação sem CPF/e-mail/nome/telefone | ✅     | Confirmado nesta auditoria — todo `console.error` nas Edge Functions loga só `.message` de erro do Postgres, nunca payload                                                     |
| APM com scrubbing                              | N/A    | Não há Sentry/Datadog integrado                                                                                                                                                |
| Retenção de logs com prazo definido            | 🔲     | Logs de Edge Function ficam no Supabase (retenção do plano, não configurada pela aplicação)                                                                                    |
| IP tratado como dado pessoal                   | ⚠️     | `getClientIp()` (Edge Functions) usa o IP só pra repassar à Asaas (exigência deles pra antifraude) — não persiste, mas também não está documentado como tratamento na política |

### Autenticação e Sessões

| Item                                      | Status | Evidência                                                                                                                                                                        |
| ----------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Timeout de sessão                         | 🔲     | Gerenciado pelo Supabase Auth (JWT expira, refresh automático) — não configurado explicitamente pelo projeto                                                                     |
| Logout real (token invalidado no backend) | ✅     | `supabase.auth.signOut()` invalida a sessão no GoTrue, não só limpa storage local                                                                                                |
| JWT sem dado pessoal no payload           | ✅     | Payload do Supabase Auth JWT é padrão (sub, role, email) — e-mail tecnicamente é dado pessoal mas é uso inerente ao mecanismo de auth, não campo extra adicionado pela aplicação |
| MFA obrigatório pra acesso admin          | ❌     | Não implementado — login de admin é e-mail/senha simples, mesmo caminho de cliente comum                                                                                         |
| Recuperação de senha com link expirável   | ✅     | Fluxo `ForgotPasswordPage`/`ResetPasswordPage` via Supabase Auth (`resetPasswordForEmail`), padrão deles já invalida após uso                                                    |

### Frontend / Client-side

| Item                                     | Status | Evidência                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| localStorage sem dado sensível em claro  | ✅     | Regra do projeto (`useSecureStorage`, AES) seguida consistentemente — confirmado: nenhum uso de `localStorage` direto fora do hook                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Cookies HttpOnly/Secure/SameSite=Strict  | ⚠️     | **Achado real desta auditoria**: `secureCookieStorage.ts` usa `SameSite=Lax` (não `Strict`) e **nunca `HttpOnly`** — e isso não é um bug corrigível: o cookie é escrito via `document.cookie` do lado do cliente, e `HttpOnly` só pode ser setado por header de resposta do servidor, nunca por JS. É uma limitação estrutural de qualquer SPA que gerencia sessão client-side com Supabase Auth desse jeito — a criptografia AES protege contra inspeção casual, **não protege contra XSS** (se alguém injetar JS na página, esse JS pode chamar a mesma função de decrypt que o app usa). `SameSite=Lax` (em vez de `Strict`) é proposital — `Strict` quebraria o retorno do redirect de pagamento da Asaas (`invoiceUrl` → `successUrl`) |
| Error boundary não expõe dado do usuário | 🔲     | Não auditado nesta rodada — precisa revisão de cada `catch`/toast por tela                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

### CI/CD e Ambientes

| Item                                     | Status | Evidência                                                                                                                                                                                                                                                                                 |
| ---------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dado de produção proibido em dev/staging | ❌     | **Confirmado ao vivo nesta sessão, repetidas vezes**: não existe banco de dev/staging — todo `npm run dev` local aponta pro banco de produção real. Foi necessário criar e depois apagar manualmente pedidos de teste reais (JT-0025/0026) durante testes de pagamento nesta mesma sessão |
| Secrets nunca em `.env` commitado        | ✅     | `.env` gitignored desde o início, confirmado                                                                                                                                                                                                                                              |
| Seeds/fixtures com dado fictício         | ⚠️     | Contas de teste (`cliente.teste@`, `admin.teste@`) existem no banco real de produção, não um ambiente separado                                                                                                                                                                            |
| Acesso a produção restrito por role      | ⚠️     | Role de app restringe por RLS, mas o **desenvolvedor (Claude, via CLI autenticado)** tem acesso direto de superusuário ao Postgres de produção durante as sessões — usado repetidas vezes nesta sessão pra debug/correção manual                                                          |

---

## Gaps do checklist "comuns em SaaS" — aplicados à Jomar

| #                                      | Gap                                                                 | Presente aqui?                                                        |
| -------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1                                      | Cookie banner sem recusa granular por categoria                     | ✅ Sim, presente (binário)                                            |
| 2                                      | Política com "parceiros" genéricos                                  | ❌ Não — Jomar nomeia os 3 operadores reais                           |
| 3                                      | Consentimento mesclado nos Termos de Uso                            | N/A — nem existe Termos de Uso                                        |
| 4                                      | Canal de direitos sem SLA/resposta real                             | ✅ Sim, presente                                                      |
| 5                                      | Backup não coberto pela política de exclusão                        | ✅ Sim, não auditável/não definido                                    |
| 6                                      | Operadores sem DPA                                                  | ✅ Sim, presente                                                      |
| 11                                     | DPO não identificado publicamente                                   | ⚠️ Identificado como "não designado", mas ver ressalva jurídica acima |
| **Novo, não estava na lista genérica** | **Dev local sem banco separado — todo teste roda em produção real** | ✅ Sim, presente — risco técnico + LGPD combinados                    |
| **Novo**                               | **Rate limiting ausente em endpoint que cobra cartão de crédito**   | ✅ Sim, presente                                                      |
