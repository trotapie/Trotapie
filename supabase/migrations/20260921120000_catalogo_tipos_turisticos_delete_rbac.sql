-- Align delete authorization with the catalog management permission model.
drop policy if exists catalogo_tipos_turisticos_delete_admin
  on public.catalogo_tipos_turisticos;

create policy catalogo_tipos_turisticos_delete_catalogos_manage
  on public.catalogo_tipos_turisticos
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles as profile
      where profile.id = (select auth.uid())
        and (
          profile.role = 'admin'
          or exists (
            select 1
            from public.roles as role
            inner join public.role_permissions as role_permission
              on role_permission.role_id = role.id
            inner join public.permissions as permission
              on permission.id = role_permission.permission_id
            where role.key = profile.role
              and permission.key = 'catalogos.manage'
          )
        )
    )
  );
