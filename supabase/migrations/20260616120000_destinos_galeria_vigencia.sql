alter table if exists public.atracciones_imagenes
  add column if not exists vigencia_desde date null;

alter table if exists public.atracciones_imagenes
  add column if not exists vigencia_hasta date null;

alter table if exists public.atracciones_imagenes
  add column if not exists carpeta text null;

do $$
begin
  if exists (
    select 1
    from information_schema.constraint_column_usage
    where table_schema = 'public'
      and table_name = 'atracciones_imagenes'
      and constraint_name = 'atracciones_imagenes_vigencia_check'
  ) then
    alter table public.atracciones_imagenes
      drop constraint atracciones_imagenes_vigencia_check;
  end if;
end $$;

alter table public.atracciones_imagenes
  add constraint atracciones_imagenes_vigencia_check
  check (
    vigencia_desde is null
    or vigencia_hasta is null
    or vigencia_desde <= vigencia_hasta
  );

update public.atracciones_imagenes ai
set activa = false
from (
  select id,
         row_number() over (
           partition by atraccion_id
           order by coalesce(orden, 2147483647), id
         ) as rn
  from public.atracciones_imagenes
  where activa = true
) x
where ai.id = x.id
  and x.rn > 1;

create unique index if not exists atracciones_imagenes_unica_activa_por_atraccion
  on public.atracciones_imagenes (atraccion_id)
  where activa = true;

create index if not exists atracciones_imagenes_vigencia_idx
  on public.atracciones_imagenes (atraccion_id, vigencia_desde, vigencia_hasta, activa, orden);
