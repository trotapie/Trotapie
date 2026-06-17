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
as $$
declare
  v_detalle_id bigint;
  v_carpeta_origen record;
  v_carpeta_destino record;
  v_nombre_normalizado text;
  v_siguiente_orden integer;
  v_filas_afectadas integer := 0;
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

      insert into public.atracciones_carpetas (atraccion_id, nombre, orden)
      values (p_actividad_id, v_nombre_normalizado, v_siguiente_orden)
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

grant execute on function public.administrar_carpeta_actividad_admin(bigint, bigint, bigint, text, bigint, text) to anon, authenticated;
