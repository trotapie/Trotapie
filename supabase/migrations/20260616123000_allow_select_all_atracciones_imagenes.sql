drop policy if exists atracciones_imagenes_select_all on public.atracciones_imagenes;

create policy atracciones_imagenes_select_all
  on public.atracciones_imagenes
  for select
  to anon, authenticated
  using (true);
