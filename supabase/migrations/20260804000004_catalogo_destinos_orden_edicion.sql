-- Permite administrar el orden del catálogo sin modificar el modelo legacy.

alter table public.catalogo_destinos
  add column if not exists orden integer not null default 0;

alter table public.catalogo_destinos
  add column if not exists imagen_destino text;

alter table public.catalogo_destinos
  drop constraint if exists catalogo_destinos_orden_check;

alter table public.catalogo_destinos
  add constraint catalogo_destinos_orden_check check (orden >= 0);

create index if not exists catalogo_destinos_division_orden_idx
  on public.catalogo_destinos (division_area_id, orden, id);

grant update (nombre, orden, imagen_destino, activo) on public.catalogo_destinos to authenticated;

drop policy if exists catalogo_destinos_update_admin on public.catalogo_destinos;
create policy catalogo_destinos_update_admin
  on public.catalogo_destinos
  for update to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
    and orden >= 0
  );

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
  cd.activo
from public.catalogo_destinos cd
join public.divisiones_area d on d.id = cd.division_area_id
join public.paises p on p.id = d.pais_id
join public.regiones r on r.id = p.region_id
where p.iso2 <> 'MX';

grant select on public.v_catalogo_nacionales_destinos_admin to anon, authenticated;
grant select on public.v_catalogo_internacional_destinos_admin to anon, authenticated;

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
  case when p.iso2 = 'MX' then 'NACIONAL' else 'INTERNACIONAL' end as tipo
from public.catalogo_destinos cd
join public.detalles_destinos dd on dd.catalogo_destino_id = cd.id
join public.divisiones_area da on da.id = cd.division_area_id
join public.paises p on p.id = da.pais_id
join public.regiones r on r.id = p.region_id
where cd.activo = true;

grant select on public.v_catalogo_destinos_publicables to anon, authenticated;
