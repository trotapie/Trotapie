-- El catálogo se independiza del modelo heredado. Las columnas legacy se
-- conservan temporalmente, pero dejan de ser necesarias para nuevos registros.
drop view if exists public.v_catalogo_destinos_publicables;
drop view if exists public.v_catalogo_destinos_configurados;
drop view if exists public.v_hoteles_catalogo_admin;

drop table if exists public.catalogo_destinos_legacy_map;

alter table public.detalles_destinos alter column destino_id drop not null;
alter table public.circuito_destinos alter column destino_id drop not null;
alter table public.hoteles alter column destino_id drop not null;

create view public.v_catalogo_destinos_configurados
with (security_invoker = true) as
select
  cd.id as destino_id,
  cd.division_area_id,
  da.pais_id,
  p.region_id
from public.catalogo_destinos cd
join public.divisiones_area da on da.id = cd.division_area_id
join public.paises p on p.id = da.pais_id
join public.detalles_destinos dd on dd.catalogo_destino_id = cd.id;

grant select on public.v_catalogo_destinos_configurados to anon, authenticated;

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
  case when p.iso2 = 'MX' then 'NACIONAL' else 'INTERNACIONAL' end as tipo
from public.catalogo_destinos cd
join public.detalles_destinos dd on dd.catalogo_destino_id = cd.id
join public.divisiones_area da on da.id = cd.division_area_id
join public.paises p on p.id = da.pais_id
join public.regiones r on r.id = p.region_id
where cd.activo = true;

grant select on public.v_catalogo_destinos_publicables to anon, authenticated;

create view public.v_hoteles_catalogo_admin
with (security_invoker = true) as
select
  h.id,
  h.orden,
  h.regimen_id,
  h.destino_id as legacy_destino_id,
  h.division_area_id,
  h.catalogo_destino_id,
  coalesce(ht.nombre_hotel, '') as nombre_hotel,
  coalesce(rt.descripcion, '') as regimen,
  cd.id as catalogo_destino_id_resuelto,
  cd.nombre as catalogo_destino_nombre_resuelto,
  coalesce(da_direct.id, da_catalogo.id) as division_area_id_resuelto,
  coalesce(da_direct.nombre, da_catalogo.nombre) as division_area_nombre_resuelto,
  coalesce(p_direct.id, p_catalogo.id) as pais_id_resuelto,
  coalesce(p_direct.nombre, p_catalogo.nombre) as pais_nombre_resuelto,
  coalesce(r_direct.id, r_catalogo.id) as region_id_resuelto,
  coalesce(r_direct.nombre, r_catalogo.nombre) as region_nombre_resuelto,
  case when coalesce(p_direct.iso2, p_catalogo.iso2) = 'MX' then 'NACIONAL'
       when coalesce(p_direct.id, p_catalogo.id) is not null then 'INTERNACIONAL' else null end as tipo_catalogo
from public.hoteles h
left join public.hotel_traducciones ht on ht.hotel_id = h.id and ht.idioma_id = 1
left join public.regimen_traducciones rt on rt.regimen_id = h.regimen_id and rt.idioma_id = 1
left join public.catalogo_destinos cd on cd.id = h.catalogo_destino_id
left join public.divisiones_area da_direct on da_direct.id = h.division_area_id
left join public.divisiones_area da_catalogo on da_catalogo.id = cd.division_area_id
left join public.paises p_direct on p_direct.id = da_direct.pais_id
left join public.paises p_catalogo on p_catalogo.id = da_catalogo.pais_id
left join public.regiones r_direct on r_direct.id = p_direct.region_id
left join public.regiones r_catalogo on r_catalogo.id = p_catalogo.region_id;

grant select on public.v_hoteles_catalogo_admin to anon, authenticated;
