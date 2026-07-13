create or replace function public.obtener_tratamiento_cliente_por_cotizacion_publica(
  p_public_id uuid
)
returns table (
  tratamiento_abreviacion text,
  cliente_nombre_completo text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.abreviacion::text as tratamiento_abreviacion,
    coalesce(c.nombre_completo, c.nombre)::text as cliente_nombre_completo
  from public.solicitudes_cotizacion as s
  join public.clientes as c on c.id = s.cliente_id
  left join public.tratamientos as t on t.id = c.tratamiento_id
  where s.public_id = p_public_id
  limit 1;
$$;

grant execute on function public.obtener_tratamiento_cliente_por_cotizacion_publica(uuid) to anon, authenticated;
