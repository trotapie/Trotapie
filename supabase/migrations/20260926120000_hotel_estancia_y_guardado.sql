-- La información de estancia se carga de forma individual por hotel.
alter table public.hoteles add column if not exists horarios jsonb;
alter table public.hotel_traducciones add column if not exists plan_todo_incluido jsonb;

create or replace function public.guardar_hotel_estancia_admin(p_hotel_id bigint, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hotel_id bigint;
  v_item jsonb;
  v_imagen_id bigint;
begin
  if (select auth.uid()) is null or not (select public.es_administrador_actual()) then
    raise exception 'No tienes permiso para guardar hoteles';
  end if;
  if p_payload is null or nullif(btrim(p_payload->>'nombre_hotel'), '') is null then
    raise exception 'El nombre del hotel es obligatorio';
  end if;
  if p_payload ? 'horarios' and jsonb_typeof(p_payload->'horarios') not in ('object', 'null') then
    raise exception 'Los horarios deben ser un objeto JSON';
  end if;
  if p_hotel_id is null then
    insert into public.hoteles (orden, estrellas, fondo, ubicacion, destino_id,
      catalogo_destino_id, descuento_id, regimen_id, horarios)
    values ((p_payload->>'orden')::integer, (p_payload->>'estrellas')::numeric,
      p_payload->>'fondo', p_payload->>'ubicacion', (p_payload->>'destino_id')::bigint,
      (p_payload->>'catalogo_destino_id')::bigint, (p_payload->>'descuento_id')::bigint,
      (p_payload->>'regimen_id')::bigint, nullif(p_payload->'horarios', 'null'::jsonb))
    returning id into v_hotel_id;
  else
    update public.hoteles set
      orden = (p_payload->>'orden')::integer,
      estrellas = (p_payload->>'estrellas')::numeric,
      fondo = p_payload->>'fondo',
      ubicacion = p_payload->>'ubicacion',
      destino_id = (p_payload->>'destino_id')::bigint,
      catalogo_destino_id = (p_payload->>'catalogo_destino_id')::bigint,
      descuento_id = (p_payload->>'descuento_id')::bigint,
      regimen_id = (p_payload->>'regimen_id')::bigint,
      horarios = nullif(p_payload->'horarios', 'null'::jsonb)
    where id = p_hotel_id returning id into v_hotel_id;
    if v_hotel_id is null then
      raise exception 'No se encontró el hotel';
    end if;
  end if;

  for v_item in select value from jsonb_array_elements(coalesce(p_payload->'traducciones', '[]'::jsonb)) loop
    if v_item ? 'plan_todo_incluido'
       and jsonb_typeof(v_item->'plan_todo_incluido') not in ('object', 'null') then
      raise exception 'El plan debe ser un objeto JSON';
    end if;
    insert into public.hotel_traducciones
      (hotel_id, idioma_id, nombre_hotel, descripcion, plan_todo_incluido)
    values (v_hotel_id, (v_item->>'idioma_id')::bigint,
      v_item->>'nombre_hotel', v_item->>'descripcion', nullif(v_item->'plan_todo_incluido', 'null'::jsonb))
    on conflict (hotel_id, idioma_id) do update set
      nombre_hotel = excluded.nombre_hotel,
      descripcion = excluded.descripcion,
      plan_todo_incluido = excluded.plan_todo_incluido;
  end loop;

  delete from public.regimen_hotel where hotel_id = v_hotel_id;
  insert into public.regimen_hotel (hotel_id, regimen_id)
  select v_hotel_id, id from (
    select distinct value::bigint as id
    from jsonb_array_elements_text(coalesce(p_payload->'regimen_ids', '[]'::jsonb))
  ) ids;

  delete from public.actividades_hotel where hotel_id = v_hotel_id;
  insert into public.actividades_hotel (hotel_id, actividad_id)
  select v_hotel_id, id from (
    select distinct value::bigint as id
    from jsonb_array_elements_text(coalesce(p_payload->'actividad_ids', '[]'::jsonb))
  ) ids;

  delete from public.hotel_tipos_habitacion where hotel_id = v_hotel_id;
  insert into public.hotel_tipos_habitacion (hotel_id, tipo_habitacion_id)
  select v_hotel_id, id from (
    select distinct value::bigint as id
    from jsonb_array_elements_text(coalesce(p_payload->'room_type_ids', '[]'::jsonb))
  ) ids;

  for v_item in select value from jsonb_array_elements(coalesce(p_payload->'imagenes', '[]'::jsonb)) loop
    v_imagen_id := (v_item->>'id')::bigint;
    if v_imagen_id is not null then
      if coalesce((v_item->>'eliminar')::boolean, false) then
        delete from public.imagenes_hoteles where id = v_imagen_id and hotel_id = v_hotel_id;
      else
        update public.imagenes_hoteles set
          url_imagen = v_item->>'url_imagen',
          tipo_imagen_id = (v_item->>'tipo_imagen_id')::bigint
        where id = v_imagen_id and hotel_id = v_hotel_id;
        if not found then raise exception 'La imagen no pertenece al hotel'; end if;
      end if;
    elsif not coalesce((v_item->>'eliminar')::boolean, false)
      and nullif(btrim(v_item->>'url_imagen'), '') is not null then
      insert into public.imagenes_hoteles (hotel_id, url_imagen, tipo_imagen_id)
      values (v_hotel_id, v_item->>'url_imagen', (v_item->>'tipo_imagen_id')::bigint);
    end if;
  end loop;

  return jsonb_build_object('hotel_id', v_hotel_id);
end;
$$;

revoke all on function public.guardar_hotel_estancia_admin(bigint, jsonb) from public, anon;
grant execute on function public.guardar_hotel_estancia_admin(bigint, jsonb) to authenticated;

-- Se retiran todas las firmas anteriores después de instalar el reemplazo.
do $$
declare v_signature text;
begin
  for v_signature in
    select p.oid::regprocedure::text
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'guardar_hotel_detalle_admin'
  loop
    execute 'drop function ' || v_signature;
  end loop;
end $$;
