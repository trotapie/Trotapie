create table if not exists public.tratamientos (
  id bigint primary key generated always as identity,
  nombre varchar(50) not null,
  abreviacion varchar(15) not null unique,
  estatus boolean not null default true
);

grant select on public.tratamientos to anon;
grant select, insert, update, delete on public.tratamientos to authenticated;
grant all on public.tratamientos to service_role;

grant usage, select on sequence public.tratamientos_id_seq to authenticated, service_role;

alter table public.tratamientos enable row level security;

drop policy if exists tratamientos_select_all on public.tratamientos;
create policy tratamientos_select_all
  on public.tratamientos
  for select
  to anon, authenticated
  using (true);

drop policy if exists tratamientos_insert_auth on public.tratamientos;
create policy tratamientos_insert_auth
  on public.tratamientos
  for insert
  to authenticated
  with check (true);

drop policy if exists tratamientos_update_auth on public.tratamientos;
create policy tratamientos_update_auth
  on public.tratamientos
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists tratamientos_delete_auth on public.tratamientos;
create policy tratamientos_delete_auth
  on public.tratamientos
  for delete
  to authenticated
  using (true);
