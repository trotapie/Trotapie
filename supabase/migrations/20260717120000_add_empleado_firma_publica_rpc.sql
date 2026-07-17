create or replace function public.obtener_empleado_firma_por_cotizacion_publica(
  p_public_id uuid
)
returns table (
  nombre text,
  cargo text,
  email text,
  telefono text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.nombre::text,
    e.cargo::text,
    e.email::text,
    e.telefono::text
  from public.solicitudes_cotizacion as s
  join public.empleados as e on e.id = s.empleado_id
  where s.public_id = p_public_id
  limit 1;
$$;

grant execute on function public.obtener_empleado_firma_por_cotizacion_publica(uuid) to anon, authenticated;
