-- Solo expone destinos que ya cuentan con una ficha editorial heredada vinculada.
-- El fallback evita publicar fichas vacías mientras se completa la migración.
drop view if exists public.v_catalogo_destinos_publicables;

create view public.v_catalogo_destinos_publicables
with (security_invoker = true) as
select
  cd.id as catalogo_destino_id,
  lm.legacy_destino_id,
  r.id as region_id,
  r.nombre as region_nombre,
  p.id as pais_id,
  p.nombre as pais_nombre,
  d.id as division_area_id,
  d.nombre as division_area_nombre,
  cd.nombre as destino_nombre,
  cd.slug as destino_slug,
  legacy.imagen_destino,
  case when p.iso2 = 'MX' then 'NACIONAL' else 'INTERNACIONAL' end as tipo
from public.catalogo_destinos_legacy_map lm
join public.catalogo_destinos cd on cd.id = lm.catalogo_destino_id and cd.activo = true
join public.divisiones_area d on d.id = cd.division_area_id
join public.paises p on p.id = d.pais_id
join public.regiones r on r.id = p.region_id
join public.detalles_destinos detalle on detalle.destino_id = lm.legacy_destino_id
join public.destinos legacy on legacy.id = lm.legacy_destino_id and legacy.activo = true;

grant select on public.v_catalogo_destinos_publicables to anon, authenticated;
