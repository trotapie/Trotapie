-- Permite que el selector publico use las mismas vistas del catalogo administrativo.

drop view if exists public.v_catalogo_nacionales_destinos_admin;
create view public.v_catalogo_nacionales_destinos_admin
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
  cd.orden as destino_orden,
  cd.imagen_destino,
  cd.activo
from public.catalogo_destinos cd
join public.divisiones_area d on d.id = cd.division_area_id
join public.paises p on p.id = d.pais_id
join public.regiones r on r.id = p.region_id
where p.iso2 = 'MX';

drop view if exists public.v_catalogo_internacional_destinos_admin;
create view public.v_catalogo_internacional_destinos_admin
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
  cd.orden as destino_orden,
  cd.imagen_destino,
  cd.activo
from public.catalogo_destinos cd
join public.divisiones_area d on d.id = cd.division_area_id
join public.paises p on p.id = d.pais_id
join public.regiones r on r.id = p.region_id
where p.iso2 <> 'MX';

grant select on public.v_catalogo_nacionales_destinos_admin to anon, authenticated;
grant select on public.v_catalogo_internacional_destinos_admin to anon, authenticated;
