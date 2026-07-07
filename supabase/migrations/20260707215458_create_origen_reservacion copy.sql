create table if not exists public.origen_reservacion (
  id bigint primary key generated always as identity,
  clave varchar(20) not null unique,
  nombre_cotizador varchar(120) not null
);

grant select on public.origen_reservacion to anon;
grant select, insert, update, delete on public.origen_reservacion to authenticated;
grant all on public.origen_reservacion to service_role;

grant usage, select on sequence public.origen_reservacion_id_seq to authenticated, service_role;

alter table public.origen_reservacion enable row level security;

drop policy if exists origen_reservacion_select_all on public.origen_reservacion;
create policy origen_reservacion_select_all
  on public.origen_reservacion
  for select
  to anon, authenticated
  using (true);

drop policy if exists origen_reservacion_insert_auth on public.origen_reservacion;
create policy origen_reservacion_insert_auth
  on public.origen_reservacion
  for insert
  to authenticated
  with check (true);

drop policy if exists origen_reservacion_update_auth on public.origen_reservacion;
create policy origen_reservacion_update_auth
  on public.origen_reservacion
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists origen_reservacion_delete_auth on public.origen_reservacion;
create policy origen_reservacion_delete_auth
  on public.origen_reservacion
  for delete
  to authenticated
  using (true);
