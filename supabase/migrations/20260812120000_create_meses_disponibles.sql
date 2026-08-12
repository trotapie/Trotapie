create table if not exists public.meses_disponibles (
  id bigint primary key generated always as identity,
  meses smallint not null check (meses > 0),
  activo boolean not null default true,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  unique (meses)
);

create index if not exists meses_disponibles_activo_orden_idx
  on public.meses_disponibles (activo, orden, meses);

grant select on public.meses_disponibles to anon, authenticated;
grant insert, update, delete on public.meses_disponibles to authenticated;
grant all on public.meses_disponibles to service_role;
grant usage, select on sequence public.meses_disponibles_id_seq to authenticated, service_role;

alter table public.meses_disponibles enable row level security;

drop policy if exists meses_disponibles_select_activos on public.meses_disponibles;
create policy meses_disponibles_select_activos
  on public.meses_disponibles
  for select
  to anon
  using (activo = true);

create policy meses_disponibles_select_auth
  on public.meses_disponibles
  for select
  to authenticated
  using (true);

drop policy if exists meses_disponibles_insert_auth on public.meses_disponibles;
create policy meses_disponibles_insert_auth
  on public.meses_disponibles
  for insert
  to authenticated
  with check (true);

drop policy if exists meses_disponibles_update_auth on public.meses_disponibles;
create policy meses_disponibles_update_auth
  on public.meses_disponibles
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists meses_disponibles_delete_auth on public.meses_disponibles;
create policy meses_disponibles_delete_auth
  on public.meses_disponibles
  for delete
  to authenticated
  using (true);
