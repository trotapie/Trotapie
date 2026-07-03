alter table public.hoteles
  add column if not exists division_area_id bigint references public.divisiones_area(id) on delete set null,
  add column if not exists catalogo_destino_id bigint references public.catalogo_destinos(id) on delete set null;

create index if not exists hoteles_division_area_id_idx
  on public.hoteles (division_area_id);

create index if not exists hoteles_catalogo_destino_id_idx
  on public.hoteles (catalogo_destino_id);

create table if not exists public.catalogo_destinos_legacy_map (
  legacy_destino_id bigint primary key references public.destinos(id) on delete cascade,
  catalogo_destino_id bigint null references public.catalogo_destinos(id) on delete cascade,
  division_area_id bigint null references public.divisiones_area(id) on delete cascade,
  pais_id bigint not null references public.paises(id) on delete cascade,
  tipo_origen text not null check (tipo_origen in ('nacional', 'internacional')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalogo_destinos_legacy_map_ref_check
    check (catalogo_destino_id is not null or division_area_id is not null)
);

create unique index if not exists catalogo_destinos_legacy_map_catalogo_destino_unique
  on public.catalogo_destinos_legacy_map (catalogo_destino_id)
  where catalogo_destino_id is not null;

create unique index if not exists catalogo_destinos_legacy_map_division_area_unique
  on public.catalogo_destinos_legacy_map (division_area_id)
  where division_area_id is not null and tipo_origen = 'nacional';

create index if not exists catalogo_destinos_legacy_map_pais_id_idx
  on public.catalogo_destinos_legacy_map (pais_id);

create or replace function public.set_catalogo_destinos_legacy_map_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_catalogo_destinos_legacy_map_updated_at
  on public.catalogo_destinos_legacy_map;

create trigger set_catalogo_destinos_legacy_map_updated_at
before update on public.catalogo_destinos_legacy_map
for each row
execute function public.set_catalogo_destinos_legacy_map_updated_at();

alter table public.catalogo_destinos_legacy_map enable row level security;

drop policy if exists catalogo_destinos_legacy_map_select_all on public.catalogo_destinos_legacy_map;
create policy catalogo_destinos_legacy_map_select_all
  on public.catalogo_destinos_legacy_map
  for select
  to anon, authenticated
  using (true);

drop view if exists public.v_hoteles_catalogo_admin;

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
  coalesce(cd_direct.id, cd_map.id) as catalogo_destino_id_resuelto,
  coalesce(cd_direct.nombre, cd_map.nombre) as catalogo_destino_nombre_resuelto,
  coalesce(da_direct.id, da_from_cd.id, da_map.id) as division_area_id_resuelto,
  coalesce(da_direct.nombre, da_from_cd.nombre, da_map.nombre) as division_area_nombre_resuelto,
  coalesce(p_direct.id, p_from_cd.id, p_map.id) as pais_id_resuelto,
  coalesce(p_direct.nombre, p_from_cd.nombre, p_map.nombre) as pais_nombre_resuelto,
  coalesce(r_direct.id, r_from_cd.id, r_map.id) as region_id_resuelto,
  coalesce(r_direct.nombre, r_from_cd.nombre, r_map.nombre) as region_nombre_resuelto,
  case
    when coalesce(p_direct.iso2, p_from_cd.iso2, p_map.iso2) = 'MX' then 'NACIONAL'
    when coalesce(p_direct.id, p_from_cd.id, p_map.id) is not null then 'INTERNACIONAL'
    else null
  end as tipo_catalogo
from public.hoteles h
left join public.hotel_traducciones ht
  on ht.hotel_id = h.id
 and ht.idioma_id = 1
left join public.regimen_traducciones rt
  on rt.regimen_id = h.regimen_id
 and rt.idioma_id = 1
left join public.catalogo_destinos cd_direct
  on cd_direct.id = h.catalogo_destino_id
left join public.divisiones_area da_direct
  on da_direct.id = h.division_area_id
left join public.divisiones_area da_from_cd
  on da_from_cd.id = cd_direct.division_area_id
left join public.paises p_direct
  on p_direct.id = da_direct.pais_id
left join public.paises p_from_cd
  on p_from_cd.id = da_from_cd.pais_id
left join public.regiones r_direct
  on r_direct.id = p_direct.region_id
left join public.regiones r_from_cd
  on r_from_cd.id = p_from_cd.region_id
left join public.catalogo_destinos_legacy_map lm
  on lm.legacy_destino_id = h.destino_id
left join public.catalogo_destinos cd_map
  on cd_map.id = lm.catalogo_destino_id
left join public.divisiones_area da_map
  on da_map.id = coalesce(lm.division_area_id, cd_map.division_area_id)
left join public.paises p_map
  on p_map.id = coalesce(lm.pais_id, da_map.pais_id)
left join public.regiones r_map
  on r_map.id = p_map.region_id;

grant select on public.v_hoteles_catalogo_admin to anon, authenticated;
