-- Geographic configuration is managed from the Destinos module by administrators only.
create or replace function public.es_administrador_actual()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

grant execute on function public.es_administrador_actual() to authenticated;

do $$
declare
  tabla text;
begin
  foreach tabla in array array['regiones', 'paises', 'divisiones_area']
  loop
    execute format('drop policy if exists %I on public.%I', tabla || '_admin_write', tabla);
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select public.es_administrador_actual())) with check ((select public.es_administrador_actual()))',
      tabla || '_admin_write', tabla
    );
  end loop;
end $$;
