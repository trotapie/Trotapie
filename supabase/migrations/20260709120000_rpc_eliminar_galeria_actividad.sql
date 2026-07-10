create or replace function public.eliminar_galeria_actividad_admin(
  p_destino_id bigint,
  p_actividad_id bigint
)
returns jsonb
language plpgsql
as $$
declare
  v_detalle_id bigint;
  v_imagenes_eliminadas integer := 0;
  v_carpetas_eliminadas integer := 0;
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

  delete from public.atracciones_imagenes
   where atraccion_id = p_actividad_id;

  get diagnostics v_imagenes_eliminadas = row_count;

  delete from public.atracciones_carpetas
   where atraccion_id = p_actividad_id;

  get diagnostics v_carpetas_eliminadas = row_count;

  update public.atracciones_principales
     set imagen_fondo = null
   where id = p_actividad_id
     and detalles_destino_id = v_detalle_id;

  return jsonb_build_object(
    'ok', true,
    'imagenes_eliminadas', v_imagenes_eliminadas,
    'carpetas_eliminadas', v_carpetas_eliminadas
  );
end;
$$;

grant execute on function public.eliminar_galeria_actividad_admin(bigint, bigint) to anon, authenticated;
