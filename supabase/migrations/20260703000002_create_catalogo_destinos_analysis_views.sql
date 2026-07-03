drop view if exists public.v_catalogo_mexico_destinos_fallback;
drop view if exists public.v_catalogo_mexico_divisiones_revision;
drop view if exists public.v_catalogo_internacional_destinos;
drop view if exists public.v_catalogo_internacional_paises;
drop view if exists public.v_catalogo_internacional_regiones;
drop view if exists public.v_catalogo_nacionales_divisiones;

create view public.v_catalogo_nacionales_divisiones
with (security_invoker = true) as
select
  r.id as region_id,
  r.nombre as region_nombre,
  p.id as pais_id,
  p.nombre as pais_nombre,
  p.iso2 as pais_iso2,
  d.id as division_area_id,
  d.nombre as division_area_nombre,
  d.slug as division_area_slug,
  d.slug in ('mexico', 'sin-division') as es_fallback
from public.divisiones_area d
join public.paises p
  on p.id = d.pais_id
join public.regiones r
  on r.id = p.region_id
where p.iso2 = 'MX'
order by d.nombre;

create view public.v_catalogo_internacional_regiones
with (security_invoker = true) as
select
  r.id as region_id,
  r.nombre as region_nombre,
  count(distinct p.id) as total_paises,
  count(distinct d.id) as total_divisiones,
  count(distinct cd.id) as total_destinos
from public.regiones r
join public.paises p
  on p.region_id = r.id
left join public.divisiones_area d
  on d.pais_id = p.id
left join public.catalogo_destinos cd
  on cd.division_area_id = d.id
  and cd.activo = true
where p.iso2 <> 'MX'
group by r.id, r.nombre
order by r.nombre;

create view public.v_catalogo_internacional_paises
with (security_invoker = true) as
select
  r.id as region_id,
  r.nombre as region_nombre,
  p.id as pais_id,
  p.nombre as pais_nombre,
  p.iso2 as pais_iso2,
  p.slug as pais_slug,
  count(distinct d.id) as total_divisiones,
  count(distinct cd.id) as total_destinos
from public.paises p
join public.regiones r
  on r.id = p.region_id
left join public.divisiones_area d
  on d.pais_id = p.id
left join public.catalogo_destinos cd
  on cd.division_area_id = d.id
  and cd.activo = true
where p.iso2 <> 'MX'
group by r.id, r.nombre, p.id, p.nombre, p.iso2, p.slug
order by r.nombre, p.nombre;

create view public.v_catalogo_internacional_destinos
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
join public.divisiones_area d
  on d.id = cd.division_area_id
join public.paises p
  on p.id = d.pais_id
join public.regiones r
  on r.id = p.region_id
where p.iso2 <> 'MX'
  and cd.activo = true
order by r.nombre, p.nombre, cd.nombre;

create view public.v_catalogo_mexico_divisiones_revision
with (security_invoker = true) as
select
  d.id as division_area_id,
  d.nombre as division_area_nombre,
  d.slug as division_area_slug,
  count(cd.id) as total_destinos_relacionados,
  d.slug in ('mexico', 'sin-division') as es_fallback,
  d.slug = 'mexico-city' as usa_nombre_ingles,
  (
    d.slug in ('mexico', 'sin-division')
    or d.slug = 'mexico-city'
  ) as requiere_revision
from public.divisiones_area d
join public.paises p
  on p.id = d.pais_id
left join public.catalogo_destinos cd
  on cd.division_area_id = d.id
  and cd.activo = true
where p.iso2 = 'MX'
group by d.id, d.nombre, d.slug
order by requiere_revision desc, total_destinos_relacionados desc, d.nombre;

create view public.v_catalogo_mexico_destinos_fallback
with (security_invoker = true) as
select
  r.id as region_id,
  r.nombre as region_nombre,
  p.id as pais_id,
  p.nombre as pais_nombre,
  d.id as division_area_id,
  d.nombre as division_area_nombre,
  cd.id as destino_id,
  cd.nombre as destino_nombre,
  cd.slug as destino_slug
from public.catalogo_destinos cd
join public.divisiones_area d
  on d.id = cd.division_area_id
join public.paises p
  on p.id = d.pais_id
join public.regiones r
  on r.id = p.region_id
where p.iso2 = 'MX'
  and d.slug = 'mexico'
  and cd.activo = true
order by cd.nombre;

grant select on public.v_catalogo_nacionales_divisiones to anon, authenticated;
grant select on public.v_catalogo_internacional_regiones to anon, authenticated;
grant select on public.v_catalogo_internacional_paises to anon, authenticated;
grant select on public.v_catalogo_internacional_destinos to anon, authenticated;
grant select on public.v_catalogo_mexico_divisiones_revision to anon, authenticated;
grant select on public.v_catalogo_mexico_destinos_fallback to anon, authenticated;
