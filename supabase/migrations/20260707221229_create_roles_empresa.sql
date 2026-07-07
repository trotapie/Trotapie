create table if not exists public.roles_empresa (
  id bigint primary key generated always as identity,
  rol varchar(80) not null unique,
  descripcion_rol varchar(255) not null,
  estatus boolean not null default true
);

grant select on public.roles_empresa to anon;
grant select, insert, update, delete on public.roles_empresa to authenticated;
grant all on public.roles_empresa to service_role;

grant usage, select on sequence public.roles_empresa_id_seq to authenticated, service_role;

alter table public.roles_empresa enable row level security;

drop policy if exists roles_empresa_select_all on public.roles_empresa;
create policy roles_empresa_select_all
  on public.roles_empresa
  for select
  to anon, authenticated
  using (true);

drop policy if exists roles_empresa_insert_auth on public.roles_empresa;
create policy roles_empresa_insert_auth
  on public.roles_empresa
  for insert
  to authenticated
  with check (true);

drop policy if exists roles_empresa_update_auth on public.roles_empresa;
create policy roles_empresa_update_auth
  on public.roles_empresa
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists roles_empresa_delete_auth on public.roles_empresa;
create policy roles_empresa_delete_auth
  on public.roles_empresa
  for delete
  to authenticated
  using (true);
