create or replace function public.mover_imagen_actividad_admin(
  p_destino_id bigint,
  p_actividad_id bigint,
  p_imagen_id bigint,
  p_carpeta_destino_id bigint
)
returns jsonb
language plpgsql
security definer
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

grant execute on function public.mover_imagen_actividad_admin(
  bigint,
  bigint,
  bigint,
  bigint
) to anon, authenticated;
