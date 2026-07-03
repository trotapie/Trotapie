-- ============================================================================
-- Migration: Fix CRITICAL security issues
-- Date: 2026-07-02
--
-- Fixes:
--   CRIT-1: RPC functions with security definer granted to anon
--   CRIT-2: RLS policies on atracciones_imagenes wide open
--   CRIT-3: RLS policies on atracciones_carpetas wide open
--   CRIT-4: Tables without RLS enabled
-- ============================================================================

-- ============================================================================
-- CRIT-1: Recreate RPC functions with security invoker and restrict grants
-- ============================================================================

-- 1a. administrar_carpeta_actividad_admin — change to security invoker
create or replace function public.administrar_carpeta_actividad_admin(
  p_destino_id bigint,
  p_actividad_id bigint,
  p_carpeta_id bigint,
  p_accion text,
  p_carpeta_destino_id bigint default null,
  p_nueva_carpeta_nombre text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_detalle_id bigint;
  v_carpeta_origen record;
  v_carpeta_destino record;
  v_nombre_normalizado text;
  v_siguiente_orden integer;
  v_filas_afectadas integer := 0;
  v_imagenes_restantes integer := 0;
begin
  select id
    into v_detalle_id
    from public.detalles_destinos
   where destino_id = p_destino_id
   limit 1;

  if v_detalle_id is null then
    raise exception 'No se encontro el detalle del destino.';
  end if;

  perform 1
    from public.atracciones_principales
   where id = p_actividad_id
     and detalles_destino_id = v_detalle_id;

  if not found then
    raise exception 'No se encontro la actividad solicitada.';
  end if;

  select id, atraccion_id, nombre, orden
    into v_carpeta_origen
    from public.atracciones_carpetas
   where id = p_carpeta_id
     and atraccion_id = p_actividad_id
   limit 1;

  if not found then
    raise exception 'No se encontro la carpeta solicitada.';
  end if;

  if p_accion = 'delete_empty' then
    perform 1
      from public.atracciones_imagenes
     where atraccion_id = p_actividad_id
       and carpeta_id = p_carpeta_id
     limit 1;

    if found then
      raise exception 'La carpeta tiene imagenes. Usa mover o eliminar imagenes antes de borrarla.';
    end if;

    delete from public.atracciones_carpetas
     where id = p_carpeta_id
       and atraccion_id = p_actividad_id;

    return jsonb_build_object(
      'ok', true,
      'accion', p_accion,
      'carpeta_id', p_carpeta_id
    );
  end if;

  if p_accion = 'delete_images' then
    delete from public.atracciones_imagenes
     where atraccion_id = p_actividad_id
       and carpeta_id = p_carpeta_id;

    get diagnostics v_filas_afectadas = row_count;

    delete from public.atracciones_carpetas
     where id = p_carpeta_id
       and atraccion_id = p_actividad_id;

    return jsonb_build_object(
      'ok', true,
      'accion', p_accion,
      'carpeta_id', p_carpeta_id,
      'imagenes_eliminadas', v_filas_afectadas
    );
  end if;

  if p_accion = 'move_existing' then
    if p_carpeta_destino_id is null then
      raise exception 'Debes enviar la carpeta destino.';
    end if;

    select id, atraccion_id, nombre, orden
      into v_carpeta_destino
      from public.atracciones_carpetas
     where id = p_carpeta_destino_id
       and atraccion_id = p_actividad_id
     limit 1;

    if not found then
      raise exception 'No se encontro la carpeta destino.';
    end if;

    if v_carpeta_destino.id = v_carpeta_origen.id then
      raise exception 'La carpeta destino debe ser diferente.';
    end if;

    update public.atracciones_imagenes
       set carpeta_id = v_carpeta_destino.id,
           carpeta = v_carpeta_destino.nombre
     where atraccion_id = p_actividad_id
       and carpeta_id = v_carpeta_origen.id;

    get diagnostics v_filas_afectadas = row_count;

    select count(*)
      into v_imagenes_restantes
      from public.atracciones_imagenes
     where atraccion_id = p_actividad_id
       and carpeta_id = v_carpeta_origen.id;

    if v_imagenes_restantes > 0 then
      raise exception 'No se pudo vaciar la carpeta origen.';
    end if;

    delete from public.atracciones_carpetas
     where id = v_carpeta_origen.id
       and atraccion_id = p_actividad_id;

    return jsonb_build_object(
      'ok', true,
      'accion', p_accion,
      'carpeta_id', v_carpeta_origen.id,
      'carpeta_destino_id', v_carpeta_destino.id,
      'carpeta_destino_nombre', v_carpeta_destino.nombre,
      'imagenes_movidas', v_filas_afectadas
    );
  end if;

  if p_accion = 'create_and_move' then
    v_nombre_normalizado := btrim(coalesce(p_nueva_carpeta_nombre, ''));

    if v_nombre_normalizado = '' then
      raise exception 'La carpeta no puede estar vacia.';
    end if;

    v_nombre_normalizado := upper(left(v_nombre_normalizado, 1)) || substr(v_nombre_normalizado, 2);

    select id, atraccion_id, nombre, orden
      into v_carpeta_destino
      from public.atracciones_carpetas
     where atraccion_id = p_actividad_id
       and lower(nombre) = lower(v_nombre_normalizado)
     limit 1;

    if not found then
      select coalesce(max(orden), 0) + 1
        into v_siguiente_orden
        from public.atracciones_carpetas
       where atraccion_id = p_actividad_id;

      insert into public.atracciones_carpetas (
        atraccion_id,
        nombre,
        orden
      )
      values (
        p_actividad_id,
        v_nombre_normalizado,
        v_siguiente_orden
      )
      returning id, atraccion_id, nombre, orden
      into v_carpeta_destino;
    end if;

    if v_carpeta_destino.id = v_carpeta_origen.id then
      raise exception 'La carpeta destino debe ser diferente.';
    end if;

    update public.atracciones_imagenes
       set carpeta_id = v_carpeta_destino.id,
           carpeta = v_carpeta_destino.nombre
     where atraccion_id = p_actividad_id
       and carpeta_id = v_carpeta_origen.id;

    get diagnostics v_filas_afectadas = row_count;

    select count(*)
      into v_imagenes_restantes
      from public.atracciones_imagenes
     where atraccion_id = p_actividad_id
       and carpeta_id = v_carpeta_origen.id;

    if v_imagenes_restantes > 0 then
      raise exception 'No se pudo vaciar la carpeta origen.';
    end if;

    delete from public.atracciones_carpetas
     where id = v_carpeta_origen.id
       and atraccion_id = p_actividad_id;

    return jsonb_build_object(
      'ok', true,
      'accion', p_accion,
      'carpeta_id', v_carpeta_origen.id,
      'carpeta_destino_id', v_carpeta_destino.id,
      'carpeta_destino_nombre', v_carpeta_destino.nombre,
      'imagenes_movidas', v_filas_afectadas
    );
  end if;

  raise exception 'Accion no soportada.';
end;
$$;

revoke execute on function public.administrar_carpeta_actividad_admin(bigint, bigint, bigint, text, bigint, text) from anon;
grant execute on function public.administrar_carpeta_actividad_admin(bigint, bigint, bigint, text, bigint, text) to authenticated;


-- 1b. mover_imagen_actividad_admin — change to security invoker
create or replace function public.mover_imagen_actividad_admin(
  p_destino_id bigint,
  p_actividad_id bigint,
  p_imagen_id bigint,
  p_carpeta_destino_id bigint
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_detalle_id bigint;
  v_imagen record;
  v_carpeta_destino record;
  v_ids_modificados integer := 0;
begin
  select id
    into v_detalle_id
    from public.detalles_destinos
   where destino_id = p_destino_id
   limit 1;

  if v_detalle_id is null then
    raise exception 'No se encontro el detalle del destino.';
  end if;

  perform 1
    from public.atracciones_principales
   where id = p_actividad_id
     and detalles_destino_id = v_detalle_id;

  if not found then
    raise exception 'No se encontro la actividad solicitada.';
  end if;

  select ai.id, ai.atraccion_id, ai.carpeta_id, ai.imagen_url
    into v_imagen
    from public.atracciones_imagenes ai
   where ai.id = p_imagen_id
     and ai.atraccion_id = p_actividad_id
   limit 1;

  if not found then
    raise exception 'No se encontro la imagen solicitada.';
  end if;

  if v_imagen.carpeta_id = p_carpeta_destino_id then
    update public.atracciones_imagenes
       set activa = (id = p_imagen_id)
     where atraccion_id = p_actividad_id;

    return jsonb_build_object(
      'ok', true,
      'imagen_id', p_imagen_id,
      'carpeta_destino_id', p_carpeta_destino_id,
      'movida', false,
      'imagen_activa_id', p_imagen_id
    );
  end if;

  select id, atraccion_id, nombre, orden
    into v_carpeta_destino
    from public.atracciones_carpetas
   where id = p_carpeta_destino_id
     and atraccion_id = p_actividad_id
   limit 1;

  if not found then
    raise exception 'No se encontro la carpeta destino.';
  end if;

  update public.atracciones_imagenes
     set carpeta_id = v_carpeta_destino.id,
         carpeta = v_carpeta_destino.nombre,
         activa = (id = p_imagen_id)
   where id = p_imagen_id
     and atraccion_id = p_actividad_id;

  get diagnostics v_ids_modificados = row_count;

  update public.atracciones_imagenes
     set activa = false
   where atraccion_id = p_actividad_id
     and id <> p_imagen_id;

  return jsonb_build_object(
    'ok', true,
    'imagen_id', p_imagen_id,
    'carpeta_origen_id', v_imagen.carpeta_id,
    'carpeta_destino_id', v_carpeta_destino.id,
    'carpeta_destino_nombre', v_carpeta_destino.nombre,
    'movida', true,
    'imagen_activa_id', p_imagen_id,
    'imagenes_actualizadas', v_ids_modificados
  );
end;
$$;

revoke execute on function public.mover_imagen_actividad_admin(bigint, bigint, bigint, bigint) from anon;
grant execute on function public.mover_imagen_actividad_admin(bigint, bigint, bigint, bigint) to authenticated;


-- 1c. obtener_atracciones_imagenes_admin — change to security invoker
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
security invoker
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

revoke execute on function public.obtener_atracciones_imagenes_admin(integer[]) from anon;
grant execute on function public.obtener_atracciones_imagenes_admin(integer[]) to authenticated;


-- ============================================================================
-- CRIT-2: Fix RLS policies on atracciones_imagenes
-- ============================================================================

drop policy if exists atracciones_imagenes_insert_all on public.atracciones_imagenes;
create policy atracciones_imagenes_insert_auth
  on public.atracciones_imagenes
  for insert
  to authenticated
  with check (true);

drop policy if exists atracciones_imagenes_update_all on public.atracciones_imagenes;
create policy atracciones_imagenes_update_auth
  on public.atracciones_imagenes
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists atracciones_imagenes_delete_all on public.atracciones_imagenes;
create policy atracciones_imagenes_delete_auth
  on public.atracciones_imagenes
  for delete
  to authenticated
  using (true);


-- ============================================================================
-- CRIT-3: Fix RLS policies on atracciones_carpetas
-- ============================================================================

drop policy if exists atracciones_carpetas_insert_all on public.atracciones_carpetas;
create policy atracciones_carpetas_insert_auth
  on public.atracciones_carpetas
  for insert
  to authenticated
  with check (true);

drop policy if exists atracciones_carpetas_update_all on public.atracciones_carpetas;
create policy atracciones_carpetas_update_auth
  on public.atracciones_carpetas
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists atracciones_carpetas_delete_all on public.atracciones_carpetas;
create policy atracciones_carpetas_delete_auth
  on public.atracciones_carpetas
  for delete
  to authenticated
  using (true);


-- ============================================================================
-- CRIT-4: Enable RLS + add policies for unprotected tables
-- ============================================================================

-- Helper: check if caller is authenticated
-- (used inline in policy definitions via auth.role())

-- 4a. circuitos
alter table public.circuitos enable row level security;

drop policy if exists circuitos_select_all on public.circuitos;
create policy circuitos_select_all
  on public.circuitos
  for select
  to anon, authenticated
  using (true);

drop policy if exists circuitos_insert_auth on public.circuitos;
create policy circuitos_insert_auth
  on public.circuitos
  for insert
  to authenticated
  with check (true);

drop policy if exists circuitos_update_auth on public.circuitos;
create policy circuitos_update_auth
  on public.circuitos
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists circuitos_delete_auth on public.circuitos;
create policy circuitos_delete_auth
  on public.circuitos
  for delete
  to authenticated
  using (true);

-- 4b. circuito_traducciones
alter table public.circuito_traducciones enable row level security;

drop policy if exists circuito_traducciones_select_all on public.circuito_traducciones;
create policy circuito_traducciones_select_all
  on public.circuito_traducciones
  for select
  to anon, authenticated
  using (true);

drop policy if exists circuito_traducciones_insert_auth on public.circuito_traducciones;
create policy circuito_traducciones_insert_auth
  on public.circuito_traducciones
  for insert
  to authenticated
  with check (true);

drop policy if exists circuito_traducciones_update_auth on public.circuito_traducciones;
create policy circuito_traducciones_update_auth
  on public.circuito_traducciones
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists circuito_traducciones_delete_auth on public.circuito_traducciones;
create policy circuito_traducciones_delete_auth
  on public.circuito_traducciones
  for delete
  to authenticated
  using (true);

-- 4c. circuito_destinos
alter table public.circuito_destinos enable row level security;

drop policy if exists circuito_destinos_select_all on public.circuito_destinos;
create policy circuito_destinos_select_all
  on public.circuito_destinos
  for select
  to anon, authenticated
  using (true);

drop policy if exists circuito_destinos_insert_auth on public.circuito_destinos;
create policy circuito_destinos_insert_auth
  on public.circuito_destinos
  for insert
  to authenticated
  with check (true);

drop policy if exists circuito_destinos_update_auth on public.circuito_destinos;
create policy circuito_destinos_update_auth
  on public.circuito_destinos
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists circuito_destinos_delete_auth on public.circuito_destinos;
create policy circuito_destinos_delete_auth
  on public.circuito_destinos
  for delete
  to authenticated
  using (true);

-- 4d. circuito_hoteles
alter table public.circuito_hoteles enable row level security;

drop policy if exists circuito_hoteles_select_all on public.circuito_hoteles;
create policy circuito_hoteles_select_all
  on public.circuito_hoteles
  for select
  to anon, authenticated
  using (true);

drop policy if exists circuito_hoteles_insert_auth on public.circuito_hoteles;
create policy circuito_hoteles_insert_auth
  on public.circuito_hoteles
  for insert
  to authenticated
  with check (true);

drop policy if exists circuito_hoteles_update_auth on public.circuito_hoteles;
create policy circuito_hoteles_update_auth
  on public.circuito_hoteles
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists circuito_hoteles_delete_auth on public.circuito_hoteles;
create policy circuito_hoteles_delete_auth
  on public.circuito_hoteles
  for delete
  to authenticated
  using (true);

-- 4e. circuito_actividades
alter table public.circuito_actividades enable row level security;

drop policy if exists circuito_actividades_select_all on public.circuito_actividades;
create policy circuito_actividades_select_all
  on public.circuito_actividades
  for select
  to anon, authenticated
  using (true);

drop policy if exists circuito_actividades_insert_auth on public.circuito_actividades;
create policy circuito_actividades_insert_auth
  on public.circuito_actividades
  for insert
  to authenticated
  with check (true);

drop policy if exists circuito_actividades_update_auth on public.circuito_actividades;
create policy circuito_actividades_update_auth
  on public.circuito_actividades
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists circuito_actividades_delete_auth on public.circuito_actividades;
create policy circuito_actividades_delete_auth
  on public.circuito_actividades
  for delete
  to authenticated
  using (true);

-- 4f. circuito_imagenes
alter table public.circuito_imagenes enable row level security;

drop policy if exists circuito_imagenes_select_all on public.circuito_imagenes;
create policy circuito_imagenes_select_all
  on public.circuito_imagenes
  for select
  to anon, authenticated
  using (true);

drop policy if exists circuito_imagenes_insert_auth on public.circuito_imagenes;
create policy circuito_imagenes_insert_auth
  on public.circuito_imagenes
  for insert
  to authenticated
  with check (true);

drop policy if exists circuito_imagenes_update_auth on public.circuito_imagenes;
create policy circuito_imagenes_update_auth
  on public.circuito_imagenes
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists circuito_imagenes_delete_auth on public.circuito_imagenes;
create policy circuito_imagenes_delete_auth
  on public.circuito_imagenes
  for delete
  to authenticated
  using (true);

-- 4g. flyer_plantillas
alter table public.flyer_plantillas enable row level security;

drop policy if exists flyer_plantillas_select_all on public.flyer_plantillas;
create policy flyer_plantillas_select_all
  on public.flyer_plantillas
  for select
  to anon, authenticated
  using (true);

drop policy if exists flyer_plantillas_insert_auth on public.flyer_plantillas;
create policy flyer_plantillas_insert_auth
  on public.flyer_plantillas
  for insert
  to authenticated
  with check (true);

drop policy if exists flyer_plantillas_update_auth on public.flyer_plantillas;
create policy flyer_plantillas_update_auth
  on public.flyer_plantillas
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists flyer_plantillas_delete_auth on public.flyer_plantillas;
create policy flyer_plantillas_delete_auth
  on public.flyer_plantillas
  for delete
  to authenticated
  using (true);

-- 4h. circuito_flyers
alter table public.circuito_flyers enable row level security;

drop policy if exists circuito_flyers_select_all on public.circuito_flyers;
create policy circuito_flyers_select_all
  on public.circuito_flyers
  for select
  to anon, authenticated
  using (true);

drop policy if exists circuito_flyers_insert_auth on public.circuito_flyers;
create policy circuito_flyers_insert_auth
  on public.circuito_flyers
  for insert
  to authenticated
  with check (true);

drop policy if exists circuito_flyers_update_auth on public.circuito_flyers;
create policy circuito_flyers_update_auth
  on public.circuito_flyers
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists circuito_flyers_delete_auth on public.circuito_flyers;
create policy circuito_flyers_delete_auth
  on public.circuito_flyers
  for delete
  to authenticated
  using (true);

-- 4i. hotel_tipos_habitacion
alter table public.hotel_tipos_habitacion enable row level security;

drop policy if exists hotel_tipos_habitacion_select_all on public.hotel_tipos_habitacion;
create policy hotel_tipos_habitacion_select_all
  on public.hotel_tipos_habitacion
  for select
  to anon, authenticated
  using (true);

drop policy if exists hotel_tipos_habitacion_insert_auth on public.hotel_tipos_habitacion;
create policy hotel_tipos_habitacion_insert_auth
  on public.hotel_tipos_habitacion
  for insert
  to authenticated
  with check (true);

drop policy if exists hotel_tipos_habitacion_update_auth on public.hotel_tipos_habitacion;
create policy hotel_tipos_habitacion_update_auth
  on public.hotel_tipos_habitacion
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists hotel_tipos_habitacion_delete_auth on public.hotel_tipos_habitacion;
create policy hotel_tipos_habitacion_delete_auth
  on public.hotel_tipos_habitacion
  for delete
  to authenticated
  using (true);
