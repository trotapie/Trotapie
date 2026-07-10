alter table public.estatus_cotizacion enable row level security;

drop policy if exists estatus_cotizacion_insert_admin on public.estatus_cotizacion;
create policy estatus_cotizacion_insert_admin
  on public.estatus_cotizacion
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

drop policy if exists estatus_cotizacion_update_admin on public.estatus_cotizacion;
create policy estatus_cotizacion_update_admin
  on public.estatus_cotizacion
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

drop policy if exists estatus_cotizacion_delete_admin on public.estatus_cotizacion;
create policy estatus_cotizacion_delete_admin
  on public.estatus_cotizacion
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
