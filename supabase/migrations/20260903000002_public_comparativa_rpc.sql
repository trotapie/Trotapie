-- Publishes only the presentation fields required by a shared hotel comparison.
create or replace function public.obtener_comparativa_por_public_id(p_public_id text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'id', cm.id,
    'public_id', cm.public_id,
    'cliente_nombre', coalesce(c.nombre_completo, c.nombre, cm.nombre_persona, 'Cliente'),
    'nombre_persona', cm.nombre_persona,
    'fecha_entrada', cm.fecha_entrada,
    'fecha_salida', cm.fecha_salida,
    'noches', cm.noches,
    'total_personas', cm.total_personas,
    'total_habitaciones', cm.total_habitaciones,
    'created_at', cm.created_at,
    'cotizacion', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', sc.id,
          'public_id', sc.public_id,
          'hotel_id', h.id,
          'hotel_nombre', coalesce(ht.nombre_hotel, ''),
          'destino_id', d.id,
          'destino_nombre', coalesce(d.nombre, ''),
          'tipo_destino', case when d.tipo_desino_id = 2 then 'INTERNACIONAL' else 'NACIONAL' end,
          'regimen', coalesce(rt.descripcion, ''),
          'precio', sc.precio_cotizacion,
          'precio_con_seguro', sc.precio_con_seguro,
          'precio_a_meses', sc.precio_a_meses,
          'estrellas', h.estrellas,
          'fondo', h.fondo,
          'orden', coalesce((sc.cotizacion_multiple ->> 'orden')::integer, cs.id),
          'es_principal', coalesce((sc.cotizacion_multiple ->> 'es_principal')::boolean, false)
        )
        order by coalesce((sc.cotizacion_multiple ->> 'orden')::integer, cs.id)
      )
      from cotizaciones_solicitudes cs
      left join solicitudes_cotizacion sc on sc.id = cs.solicitud_cotizacion_id
      left join hoteles h on h.id = sc.hotel_id
      left join hotel_traducciones ht on ht.hotel_id = h.id and ht.idioma_id = 1
      left join destinos d on d.id = h.destino_id
      left join regimen r on r.id = sc.regimen_id
      left join regimen_traducciones rt on rt.regimen_id = r.id and rt.idioma_id = 1
      where cs.cotizacion_multiple_id = cm.id
    ), '[]'::jsonb)
  )
  from cotizaciones_multiples cm
  left join clientes c on c.id = cm.cliente_id
  where cm.public_id = nullif(trim(p_public_id), '')::uuid;
$$;

grant execute on function public.obtener_comparativa_por_public_id(text) to anon, authenticated;
