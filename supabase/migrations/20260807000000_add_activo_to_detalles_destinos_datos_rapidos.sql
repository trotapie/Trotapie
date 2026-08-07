-- Permite ocultar datos rápidos de la ficha pública sin perder su configuración.
alter table public.detalles_destinos_datos_rapidos
  add column if not exists activo boolean not null default true;

create index if not exists detalles_destinos_datos_rapidos_activo_orden_idx
  on public.detalles_destinos_datos_rapidos (detalles_destinos_id, orden)
  where activo = true;
