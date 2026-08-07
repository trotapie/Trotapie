-- Permite a administradores actualizar previews de destinos ya existentes.
drop policy if exists detalles_destinos_update_admin on public.detalles_destinos;

create policy detalles_destinos_update_admin
  on public.detalles_destinos
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );
