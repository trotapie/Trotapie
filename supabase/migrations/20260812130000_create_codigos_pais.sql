create table if not exists public.codigos_pais (
  id bigint primary key generated always as identity,
  pais varchar(100) not null,
  prefijo varchar(8) not null,
  activo boolean not null default true,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  unique (pais, prefijo)
);

create index if not exists codigos_pais_activo_orden_idx
  on public.codigos_pais (activo, orden, pais);

insert into public.codigos_pais (pais, prefijo, activo, orden)
values
  ('México', '52', true, 1),
  ('Estados Unidos', '1', true, 2),
  ('Canadá', '1', true, 3)
on conflict (pais, prefijo) do nothing;

grant select on public.codigos_pais to anon, authenticated;
grant insert, update, delete on public.codigos_pais to authenticated;
grant all on public.codigos_pais to service_role;
grant usage, select on sequence public.codigos_pais_id_seq to authenticated, service_role;

alter table public.codigos_pais enable row level security;

create policy codigos_pais_select_anon_activos on public.codigos_pais for select to anon using (activo = true);
create policy codigos_pais_select_auth on public.codigos_pais for select to authenticated using (true);
create policy codigos_pais_insert_auth on public.codigos_pais for insert to authenticated with check (true);
create policy codigos_pais_update_auth on public.codigos_pais for update to authenticated using (true) with check (true);
create policy codigos_pais_delete_auth on public.codigos_pais for delete to authenticated using (true);
