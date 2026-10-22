-- La ruta y la navegación de Imágenes de fondo usan destinos.edit.
-- Alinear ambas tablas con ese contrato, sin conceder escritura anónima.
create or replace function public.puede_gestionar_imagenes_fondo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = (select auth.uid())
      and (
        profile.role = 'admin'
        or exists (
          select 1
          from public.roles as role
          join public.role_permissions as role_permission on role_permission.role_id = role.id
          join public.permissions as permission on permission.id = role_permission.permission_id
          where role.key = profile.role
            and permission.key = 'destinos.edit'
        )
      )
  );
$$;

revoke all on function public.puede_gestionar_imagenes_fondo() from public, anon;
grant execute on function public.puede_gestionar_imagenes_fondo() to authenticated;

do $$
declare
  tabla text;
  secuencia text;
begin
  foreach tabla in array array['imagenes_fondo', 'imagenes_fondo_traducciones'] loop
    execute format('alter table public.%I enable row level security', tabla);
    execute format('grant select, insert, update, delete on public.%I to authenticated', tabla);

    secuencia := pg_get_serial_sequence(format('public.%I', tabla), 'id');
    if secuencia is not null then
      execute format('grant usage, select on sequence %s to authenticated', secuencia);
    end if;

    -- Mantener las políticas de lectura pública existentes. Esta política permite
    -- al gestor leer también imágenes inactivas cuando la lectura pública se limita.
    execute format('drop policy if exists %I on public.%I', tabla || '_gestion_read', tabla);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select public.puede_gestionar_imagenes_fondo()))',
      tabla || '_gestion_read', tabla
    );

    execute format('drop policy if exists %I on public.%I', tabla || '_admin_insert', tabla);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select public.puede_gestionar_imagenes_fondo()))',
      tabla || '_admin_insert', tabla
    );

    execute format('drop policy if exists %I on public.%I', tabla || '_admin_update', tabla);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select public.puede_gestionar_imagenes_fondo())) with check ((select public.puede_gestionar_imagenes_fondo()))',
      tabla || '_admin_update', tabla
    );

    execute format('drop policy if exists %I on public.%I', tabla || '_admin_delete', tabla);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select public.puede_gestionar_imagenes_fondo()))',
      tabla || '_admin_delete', tabla
    );
  end loop;
end;
$$;

notify pgrst, 'reload schema';
