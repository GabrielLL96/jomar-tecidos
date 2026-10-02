-- Revisão de segurança do client-side (2026-10-01) achou falha crítica na
-- mesma classe dos fixes ccc739c/3b6582b: o GRANT tabela-inteira concedido em
-- 20260807000000_orders_backend_readiness.sql incluía INSERT em orders e
-- order_items pra `authenticated`, e as policies orders_insert_own /
-- order_items_insert_own só checam posse (auth.uid() = user_id). O fix de
-- 20260828234500 fechou o UPDATE de orders e deixou o INSERT aberto.
--
-- Consequência: qualquer cliente logado, direto do console do navegador,
-- conseguia criar pedido sem passar por create_order():
--   - `status: 'paid'` com total arbitrário (pedido aparece pago no admin,
--     sem cobrança e sem baixa de estoque);
--   - `status: 'pending', total: 0.01` + asaas-create-charge /
--     asaas-charge-with-token, que cobram `orders.total` do banco — cliente
--     paga centavos, webhook marca como pago;
--   - inserir order_items extras num pedido legítimo próprio já pago (a loja
--     separa e envia itens que não entraram no total).
--
-- Levantamento em src/ e supabase/functions/ não achou NENHUM insert direto
-- em orders/order_items: o único caminho legítimo é create_order() (security
-- definer, roda como owner — não depende de GRANT pra authenticated), que
-- recalcula preço a partir de products, valida endereço/cupom/frete e baixa
-- estoque na mesma transação. Edge functions usam service_role.
--
-- UPDATE em order_items também sai: não existe policy de update na tabela
-- (RLS já negava tudo), então o GRANT era superfície morta.
--
-- SELECT continua: Meus Pedidos e /pedido/:id leem via orders_select_own /
-- order_items_select_own.

revoke insert on public.orders from authenticated;
revoke insert, update on public.order_items from authenticated;

drop policy "orders_insert_own" on public.orders;
drop policy "order_items_insert_own" on public.order_items;
