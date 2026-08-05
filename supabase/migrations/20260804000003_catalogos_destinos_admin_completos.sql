-- Las vistas de administración deben mostrar todo el catálogo, incluidos los
-- destinos inactivos. Las vistas públicas permanecen filtradas por activo.

create or replace view public.v_catalogo_nacionales_destinos_admin
with (security_invoker = true) as
select
  r.id as region_id,
  r.nombre as region_nombre,
  p.id as pais_id,
  p.nombre as pais_nombre,
  p.iso2 as pais_iso2,
  p.slug as pais_slug,
  d.id as division_area_id,
  d.nombre as division_area_nombre,
  d.slug as division_area_slug,
  cd.id as destino_id,
  cd.nombre as destino_nombre,
  cd.slug as destino_slug,
  cd.activo
from public.catalogo_destinos cd
join public.divisiones_area d on d.id = cd.division_area_id
join public.paises p on p.id = d.pais_id
join public.regiones r on r.id = p.region_id
where p.iso2 = 'MX';

create or replace view public.v_catalogo_internacional_destinos_admin
with (security_invoker = true) as
select
  r.id as region_id,
  r.nombre as region_nombre,
  p.id as pais_id,
  p.nombre as pais_nombre,
  p.iso2 as pais_iso2,
  p.slug as pais_slug,
  d.id as division_area_id,
  d.nombre as division_area_nombre,
  d.slug as division_area_slug,
  cd.id as destino_id,
  cd.nombre as destino_nombre,
  cd.slug as destino_slug,
  cd.activo
from public.catalogo_destinos cd
join public.divisiones_area d on d.id = cd.division_area_id
join public.paises p on p.id = d.pais_id
join public.regiones r on r.id = p.region_id
where p.iso2 <> 'MX';

grant select on public.v_catalogo_nacionales_destinos_admin to anon, authenticated;
grant select on public.v_catalogo_internacional_destinos_admin to anon, authenticated;
