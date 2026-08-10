-- ============================================================================
-- DELIVERIES — colunas de correlação com a Melhor Envio, pro webhook
-- (supabase/functions/melhor-envio-webhook) conseguir casar um evento
-- recebido com o pedido certo. Ficam NULL pra sempre até a Fase 2 da
-- integração (compra de etiqueta, ainda não implementada) gravar o
-- shipment_id retornado pela Melhor Envio no momento da compra — o webhook
-- em si já fica pronto pra receber e processar eventos reais desde já.
-- ============================================================================

alter table public.deliveries
  add column melhor_envio_shipment_id uuid unique,
  add column melhor_envio_protocol text;

-- service_role já tem select/update em melhor_envio_settings (migration
-- 20260810140000); aqui a Edge Function do webhook também precisa de
-- select/update em deliveries e orders pra localizar e atualizar o pedido.
grant select, update on public.deliveries to service_role;
grant select on public.orders to service_role;
