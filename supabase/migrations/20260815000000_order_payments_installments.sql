-- ============================================================================
-- Parcelamento sem juros no cartão (até 3x) — rodapé do site já prometia
-- isso, nunca tinha sido implementado. Ver ADR-016 (continuação).
-- ============================================================================

alter table public.order_payments
  add column installment_count integer not null default 1 check (installment_count between 1 and 3);
