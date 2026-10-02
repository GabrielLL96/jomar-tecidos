-- Revisão de segurança client-side (2026-10-01): coupons_public_read
-- (`using (true)`, schema inicial) deixava qualquer visitante, sem login,
-- listar TODOS os cupons via REST (`GET /rest/v1/coupons?select=*`) —
-- inclusive agendados, de campanha privada e de uso único. O checkout só
-- precisa validar o código que o cliente digitou.
--
-- Fix: leitura direta da tabela fica restrita a staff (tela admin de
-- cupons, única outra leitura no client), e o checkout passa a usar
-- validate_coupon(p_code), que devolve no máximo o cupom daquele código e
-- só se estiver utilizável agora. Regras idênticas às que create_order()
-- aplica — validate nunca aprova o que create_order recusaria.

drop policy "coupons_public_read" on public.coupons;
create policy "coupons_select_staff" on public.coupons for select
  using (public.current_user_role() in ('admin', 'vendas', 'estoque'));

create or replace function public.validate_coupon(p_code text)
returns table (
  id uuid,
  code text,
  type public.coupon_type,
  value numeric,
  max_uses integer,
  used_count integer,
  starts_at timestamptz,
  expires_at timestamptz,
  status public.coupon_status
)
language sql
stable
security definer
set search_path = public
as $$
  select coupons.id, coupons.code, coupons.type, coupons.value, coupons.max_uses,
         coupons.used_count, coupons.starts_at, coupons.expires_at, coupons.status
    from public.coupons
    where coupons.code = upper(trim(p_code))
      and coupons.status = 'active'
      and (coupons.starts_at is null or coupons.starts_at <= now())
      and (coupons.expires_at is null or coupons.expires_at >= now())
      and (coupons.max_uses is null or coupons.used_count < coupons.max_uses)
    limit 1;
$$;

revoke execute on function public.validate_coupon(text) from public, anon;
grant execute on function public.validate_coupon(text) to authenticated;
