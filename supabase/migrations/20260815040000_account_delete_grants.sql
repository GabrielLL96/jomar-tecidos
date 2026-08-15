-- GRANTs que faltavam pra Edge Function account-delete (anonimização de
-- conta, achado da auditoria LGPD — direito de eliminação/anonimização,
-- docs/lgpd/auditoria-2026-08-15.md). Mesmo achado já repetido várias vezes
-- neste projeto: service_role não faz bypass automático de GRANT/RLS aqui.
grant update on public.reviews to service_role;
grant delete on public.saved_credit_cards to service_role;
