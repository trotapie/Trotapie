-- El catálogo geográfico se vuelve la fuente de lectura para destinos.
-- Las columnas legacy se conservan para una migración gradual y reversible.

drop view if exists public.v_catalogo_nacionales_destinos;

create view public.v_catalogo_nacionales_destinos
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
where p.iso2 = 'MX'
  and cd.activo = true
order by d.nombre, cd.nombre;

grant select on public.v_catalogo_nacionales_destinos to anon, authenticated;

alter table public.detalles_destinos
  add column if not exists catalogo_destino_id bigint references public.catalogo_destinos(id) on delete restrict;

create unique index if not exists detalles_destinos_catalogo_destino_id_unique
  on public.detalles_destinos (catalogo_destino_id)
  where catalogo_destino_id is not null;

alter table public.circuito_destinos
  add column if not exists catalogo_destino_id bigint references public.catalogo_destinos(id) on delete restrict;

create index if not exists circuito_destinos_catalogo_destino_id_idx
  on public.circuito_destinos (catalogo_destino_id);

drop view if exists public.v_catalogo_destinos_configurados;

create view public.v_catalogo_destinos_configurados
with (security_invoker = true) as
select distinct
  cd.id as destino_id,
  cd.division_area_id,
  da.pais_id,
  p.region_id
from public.catalogo_destinos cd
join public.divisiones_area da on da.id = cd.division_area_id
join public.paises p on p.id = da.pais_id
left join public.detalles_destinos dd on dd.catalogo_destino_id = cd.id
left join public.catalogo_destinos_legacy_map lm on lm.catalogo_destino_id = cd.id
left join public.detalles_destinos dd_legacy on dd_legacy.destino_id = lm.legacy_destino_id
where dd.id is not null or dd_legacy.id is not null;

grant select on public.v_catalogo_destinos_configurados to anon, authenticated;

-- Solo administradores pueden establecer el puente; no se habilitan escrituras sobre el catálogo.
drop policy if exists catalogo_destinos_legacy_map_insert_admin on public.catalogo_destinos_legacy_map;
create policy catalogo_destinos_legacy_map_insert_admin
  on public.catalogo_destinos_legacy_map
  for insert to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

drop policy if exists catalogo_destinos_legacy_map_update_admin on public.catalogo_destinos_legacy_map;
create policy catalogo_destinos_legacy_map_update_admin
  on public.catalogo_destinos_legacy_map
  for update to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );
