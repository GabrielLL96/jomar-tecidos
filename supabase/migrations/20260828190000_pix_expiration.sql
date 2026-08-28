-- due_date é so a data (sem hora) da cobranca -- inutil pra contagem
-- regressiva do Pix. O QR code da Asaas tem seu proprio expirationDate
-- (timestamp), ja buscado pela edge function mas descartado ate aqui.
alter table order_payments
  add column pix_expiration timestamptz;
