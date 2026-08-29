-- increment_coupon_usage/decrement_coupon_usage não tinham NENHUMA checagem de
-- autorização. Combinado com a policy coupons_public_read (qual: true, role
-- public), qualquer visitante não autenticado conseguia listar cupons via
-- REST e chamar essas RPCs livremente: decrementar o used_count zera o
-- contador e permite reusar infinitamente um cupom de uso único, e
-- incrementar esgota o max_uses de uma campanha antes dos clientes reais
-- usarem. Nenhuma das duas é usada fora do fluxo de staff (cancelamento de
-- pedido no admin) -- increment_coupon_usage sequer é chamada pelo frontend
-- hoje (create_order incrementa inline), mas ficava exposta do mesmo jeito.
create or replace function public.increment_coupon_usage(p_coupon_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(public.current_user_role(), 'customer') not in ('admin', 'vendas') then
    raise exception 'Sem permissão para alterar uso de cupom';
  end if;

  update public.coupons set used_count = used_count + 1 where id = p_coupon_id;
end;
$$;

create or replace function public.decrement_coupon_usage(p_coupon_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(public.current_user_role(), 'customer') not in ('admin', 'vendas') then
    raise exception 'Sem permissão para alterar uso de cupom';
  end if;

  update public.coupons set used_count = greatest(0, used_count - 1) where id = p_coupon_id;
end;
$$;

-- authenticated já tinha grant explícito (mantido, agora seguro pela checagem
-- de role acima); revoga o grant implícito de PUBLIC que deixava `anon`
-- executar sem autenticação nenhuma.
revoke execute on function public.increment_coupon_usage(uuid) from public;
revoke execute on function public.decrement_coupon_usage(uuid) from public;
grant execute on function public.increment_coupon_usage(uuid) to authenticated;
grant execute on function public.decrement_coupon_usage(uuid) to authenticated;
