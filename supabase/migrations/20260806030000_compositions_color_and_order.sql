-- Redesign da tela /admin/composicoes: precisa de cor de identificação (swatch)
-- e ordem persistida (hoje a ordem exibida no filtro de Material do catálogo
-- é um array hardcoded em código, COMPOSITION_ORDER — vira coluna real pra
-- poder ser reordenada pelo admin e continuar alimentando o mesmo filtro).
alter table public.compositions add column if not exists color text;
alter table public.compositions add column if not exists sort_order int not null default 0;

-- Backfill preservando a ordem que já existia em código pras 8 composições
-- originais; qualquer composição criada depois (nome não reconhecido) cai
-- no fim, ordenada alfabeticamente entre si.
with ranked as (
  select
    id,
    row_number() over (
      order by
        case name
          when 'Linhos' then 1
          when 'Algodões' then 2
          when 'Sedas' then 3
          when 'Aviamentos' then 4
          when 'Rendas' then 5
          when 'Algodão Egípcio' then 6
          when 'Poliéster' then 7
          when 'Nylon' then 8
          else 100
        end,
        name
    ) as rn
  from public.compositions
)
update public.compositions c
set sort_order = ranked.rn
from ranked
where ranked.id = c.id;
