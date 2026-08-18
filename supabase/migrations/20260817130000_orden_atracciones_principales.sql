alter table public.atracciones_principales
  add column if not exists orden integer;

with ordenadas as (
  select id,
    row_number() over (partition by detalles_destino_id order by coalesce(orden, id), id) as nuevo_orden
  from public.atracciones_principales
)
update public.atracciones_principales ap
set orden = ordenadas.nuevo_orden
from ordenadas
where ap.id = ordenadas.id;

create index if not exists atracciones_principales_destino_orden_idx
  on public.atracciones_principales (detalles_destino_id, orden, id);
