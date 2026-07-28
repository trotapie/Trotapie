alter table if exists public.atracciones_principales
  add column if not exists catalogo_atraccion_id bigint
    references public.catalogo_atracciones(id) on delete set null;

create index if not exists idx_atracciones_principales_catalogo_atraccion_id
  on public.atracciones_principales(catalogo_atraccion_id);
