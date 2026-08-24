-- Permite ocultar una atracción de la ficha pública sin eliminar su galería.
alter table public.atracciones_principales
  add column if not exists activo boolean not null default true;

create index if not exists atracciones_principales_destino_activo_orden_idx
  on public.atracciones_principales (detalles_destino_id, orden, id)
  where activo = true;
