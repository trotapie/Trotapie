alter table public.atracciones_imagenes enable row level security;

drop policy if exists atracciones_imagenes_insert_all on public.atracciones_imagenes;
create policy atracciones_imagenes_insert_all
  on public.atracciones_imagenes
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists atracciones_imagenes_update_all on public.atracciones_imagenes;
create policy atracciones_imagenes_update_all
  on public.atracciones_imagenes
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists atracciones_imagenes_delete_all on public.atracciones_imagenes;
create policy atracciones_imagenes_delete_all
  on public.atracciones_imagenes
  for delete
  to anon, authenticated
  using (true);
