alter table public.origen_reservacion
  add column if not exists orden integer;

with origenes_ordenados as (
  select
    id,
    row_number() over (order by nombre_cotizador asc, id asc)::integer as nuevo_orden
  from public.origen_reservacion
)
update public.origen_reservacion as origen
set orden = origenes_ordenados.nuevo_orden
from origenes_ordenados
where origen.id = origenes_ordenados.id
  and origen.orden is null;

alter table public.origen_reservacion
  alter column orden set not null;

create index if not exists origen_reservacion_orden_id_idx
  on public.origen_reservacion (orden, id);
