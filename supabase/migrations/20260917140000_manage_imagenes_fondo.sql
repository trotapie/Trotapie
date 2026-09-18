-- La pantalla administrativa necesita permisos explícitos sobre el registro
-- principal, no solamente sobre los textos traducidos.
grant select on public.imagenes_fondo to anon, authenticated;
grant insert, update, delete on public.imagenes_fondo to authenticated;
grant usage, select on sequence public.imagenes_fondo_id_seq to authenticated;

alter table public.imagenes_fondo enable row level security;

drop policy if exists imagenes_fondo_public_read on public.imagenes_fondo;
create policy imagenes_fondo_public_read
  on public.imagenes_fondo for select to anon, authenticated
  using (true);

drop policy if exists imagenes_fondo_admin_insert on public.imagenes_fondo;
create policy imagenes_fondo_admin_insert
  on public.imagenes_fondo for insert to authenticated
  with check ((select public.es_administrador_actual()));

drop policy if exists imagenes_fondo_admin_update on public.imagenes_fondo;
create policy imagenes_fondo_admin_update
  on public.imagenes_fondo for update to authenticated
  using ((select public.es_administrador_actual()))
  with check ((select public.es_administrador_actual()));

drop policy if exists imagenes_fondo_admin_delete on public.imagenes_fondo;
create policy imagenes_fondo_admin_delete
  on public.imagenes_fondo for delete to authenticated
  using ((select public.es_administrador_actual()));
