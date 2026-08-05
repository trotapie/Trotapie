-- Expone el estado del destino al selector publico y conserva el orden editorial.

drop view if exists public.v_catalogo_destinos_publicables;

create view public.v_catalogo_destinos_publicables
with (security_invoker = true) as
select
  cd.id as catalogo_destino_id,
  r.id as region_id,
  r.nombre as region_nombre,
  p.id as pais_id,
  p.nombre as pais_nombre,
  da.id as division_area_id,
  da.nombre as division_area_nombre,
  cd.nombre as destino_nombre,
  cd.slug as destino_slug,
  cd.orden as destino_orden,
  cd.imagen_destino,
  cd.activo,
  case when p.iso2 = 'MX' then 'NACIONAL' else 'INTERNACIONAL' end as tipo
from public.catalogo_destinos cd
join public.detalles_destinos dd on dd.catalogo_destino_id = cd.id
join public.divisiones_area da on da.id = cd.division_area_id
join public.paises p on p.id = da.pais_id
join public.regiones r on r.id = p.region_id
where cd.activo = true;

grant select on public.v_catalogo_destinos_publicables to anon, authenticated;
