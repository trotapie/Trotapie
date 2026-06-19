
alter table public.atracciones_imagenes
  add column if not exists nombre text,
  add column if not exists extension text,
  add column if not exists mime_type text,
  add column if not exists size bigint,
  add column if not exists size_formatted text;
  
drop function if exists public.obtener_atracciones_imagenes_admin(integer[]);

create function public.obtener_atracciones_imagenes_admin(p_atraccion_ids integer[])
returns table (
  id integer,
  atraccion_id integer,
  imagen_url varchar,
  carpeta_id bigint,
  carpeta_nombre text,
  carpeta text,
  activa boolean,
  orden integer,
  vigencia_desde date,
  vigencia_hasta date,
  created_at timestamptz,
  nombre text,
  extension text,
  mime_type text,
  size bigint,
  size_formatted text
)
language sql
security definer
set search_path = public
as $$
  select
    ai.id,
    ai.atraccion_id,
    ai.imagen_url,
    ai.carpeta_id,
    ac.nombre as carpeta_nombre,
    ai.carpeta,
    ai.activa,
    ai.orden,
    ai.vigencia_desde,
    ai.vigencia_hasta,
    ai.created_at,
    ai.nombre,
    ai.extension,
    ai.mime_type,
    ai.size,
    ai.size_formatted
  from public.atracciones_imagenes ai
  left join public.atracciones_carpetas ac
    on ac.id = ai.carpeta_id
  where ai.atraccion_id = any(p_atraccion_ids)
  order by coalesce(ai.orden, 2147483647), ai.id;
$$;


grant execute on function public.obtener_atracciones_imagenes_admin(integer[]) to anon, authenticated;
