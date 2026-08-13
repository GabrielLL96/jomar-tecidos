-- Cache de cotação real de frete (Melhor Envio) pra validar shipping_cost no
-- servidor em create_order() sem precisar chamar a API da Melhor Envio de
-- dentro do Postgres (não dá — só Edge Function faz HTTP externo aqui).
-- Edge Function melhor-envio-shipping-calculate grava as opções aqui (via
-- service_role) e devolve o id pro client; create_order() lê o preço
-- autoritativo daqui em vez de confiar no valor que o client mandar.
create table public.shipping_quotes (
  id uuid primary key default gen_random_uuid(),
  destination_zip text not null,
  options jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes')
);

-- service_role não bypassa GRANT neste projeto (achado documentado em
-- 20260810140000) — precisa de GRANT explícito igual authenticated/anon.
grant insert, select on public.shipping_quotes to service_role;

-- create_order() (security definer) lê a tabela com o privilégio do dono da
-- function, não do chamador — não precisa de GRANT nem policy pra
-- authenticated. Sem policy de leitura direta pro client: não é dado
-- sensível, mas também não tem motivo pra expor cotação de outro cliente.
alter table public.shipping_quotes enable row level security;
