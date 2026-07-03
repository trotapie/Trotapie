create table if not exists public.regiones (
  id bigint generated always as identity primary key,
  nombre text not null,
  slug text not null
);

alter table public.regiones
  add constraint regiones_nombre_unique unique (nombre);

alter table public.regiones
  add constraint regiones_slug_unique unique (slug);

create table if not exists public.paises (
  id bigint generated always as identity primary key,
  region_id bigint not null references public.regiones(id) on delete restrict,
  nombre text not null,
  iso2 varchar(2) not null,
  slug text not null
);

alter table public.paises
  add constraint paises_iso2_unique unique (iso2);

alter table public.paises
  add constraint paises_region_nombre_unique unique (region_id, nombre);

alter table public.paises
  add constraint paises_region_slug_unique unique (region_id, slug);

create index if not exists paises_region_id_idx
  on public.paises (region_id);

create table if not exists public.divisiones_area (
  id bigint generated always as identity primary key,
  pais_id bigint not null references public.paises(id) on delete restrict,
  nombre text not null,
  slug text not null
);

alter table public.divisiones_area
  add constraint divisiones_area_pais_nombre_unique unique (pais_id, nombre);

alter table public.divisiones_area
  add constraint divisiones_area_pais_slug_unique unique (pais_id, slug);

create index if not exists divisiones_area_pais_id_idx
  on public.divisiones_area (pais_id);

create table if not exists public.catalogo_destinos (
  id bigint generated always as identity primary key,
  division_area_id bigint not null references public.divisiones_area(id) on delete restrict,
  nombre text not null,
  slug text not null,
  activo boolean not null default true
);

alter table public.catalogo_destinos
  add constraint catalogo_destinos_division_nombre_unique unique (division_area_id, nombre);

alter table public.catalogo_destinos
  add constraint catalogo_destinos_division_slug_unique unique (division_area_id, slug);

create index if not exists catalogo_destinos_division_area_id_idx
  on public.catalogo_destinos (division_area_id);

create index if not exists catalogo_destinos_activo_idx
  on public.catalogo_destinos (activo);

alter table public.regiones enable row level security;
alter table public.paises enable row level security;
alter table public.divisiones_area enable row level security;
alter table public.catalogo_destinos enable row level security;

drop policy if exists regiones_select_all on public.regiones;
create policy regiones_select_all
  on public.regiones
  for select
  to anon, authenticated
  using (true);

drop policy if exists paises_select_all on public.paises;
create policy paises_select_all
  on public.paises
  for select
  to anon, authenticated
  using (true);

drop policy if exists divisiones_area_select_all on public.divisiones_area;
create policy divisiones_area_select_all
  on public.divisiones_area
  for select
  to anon, authenticated
  using (true);

drop policy if exists catalogo_destinos_select_all on public.catalogo_destinos;
create policy catalogo_destinos_select_all
  on public.catalogo_destinos
  for select
  to anon, authenticated
  using (true);
