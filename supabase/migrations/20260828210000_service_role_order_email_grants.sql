-- Achado real: service_role neste projeto so tem os GRANTs que cada
-- migration pediu explicitamente (nao e acesso total por padrao, apesar do
-- role bypassar RLS). order_items/products/product_colors/addresses nunca
-- ganharam SELECT pra service_role -- send-order-confirmation-email e
-- send-order-status-email (via fetchOrderForEmail, que le esses 3) falhavam
-- com "permission denied for table order_items" TODA VEZ, silenciosamente
-- (erro antes de chegar no logIntegrationCall, entao nem aparecia em
-- integration_logs). melhor-envio-generate-label (Fase 2) tambem precisa de
-- addresses pra montar o endereco de entrega da etiqueta.
grant select on public.order_items to service_role;
grant select on public.products to service_role;
grant select on public.product_colors to service_role;
grant select on public.addresses to service_role;
