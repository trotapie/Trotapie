-- Users with quotation access need direct visibility and update access for soft deletion.
alter table public.solicitudes_cotizacion enable row level security;

drop policy if exists solicitudes_cotizacion_select_cotizaciones
  on public.solicitudes_cotizacion;

create policy solicitudes_cotizacion_select_cotizaciones
  on public.solicitudes_cotizacion
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and (
          p.role = 'admin'
          or exists (
            select 1
            from public.roles r
            inner join public.role_permissions rp on rp.role_id = r.id
            inner join public.permissions permission on permission.id = rp.permission_id
            where r.key = p.role
              and permission.key = 'cotizaciones.view'
          )
        )
    )
  );

drop policy if exists solicitudes_cotizacion_update_cotizaciones
  on public.solicitudes_cotizacion;

create policy solicitudes_cotizacion_update_cotizaciones
  on public.solicitudes_cotizacion
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and (
          p.role = 'admin'
          or exists (
            select 1
            from public.roles r
            inner join public.role_permissions rp on rp.role_id = r.id
            inner join public.permissions permission on permission.id = rp.permission_id
            where r.key = p.role
              and permission.key = 'cotizaciones.view'
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and (
          p.role = 'admin'
          or exists (
            select 1
            from public.roles r
            inner join public.role_permissions rp on rp.role_id = r.id
            inner join public.permissions permission on permission.id = rp.permission_id
            where r.key = p.role
              and permission.key = 'cotizaciones.view'
          )
        )
    )
  );
