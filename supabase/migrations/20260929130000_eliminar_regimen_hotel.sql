-- Remove a regimen and its translations atomically. Other references (for
-- example, hotels) continue to prevent deletion through their foreign keys.
grant delete on public.regimen to authenticated;
grant delete on public.regimen_traducciones to authenticated;

drop policy if exists regimen_admin_delete on public.regimen;
create policy regimen_admin_delete on public.regimen
  for delete to authenticated
  using ((select public.es_administrador_actual()));

drop policy if exists regimen_traducciones_admin_delete on public.regimen_traducciones;
create policy regimen_traducciones_admin_delete on public.regimen_traducciones
  for delete to authenticated
  using ((select public.es_administrador_actual()));

create or replace function public.eliminar_regimen_hotel(p_regimen_id bigint)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  deleted_id bigint;
begin
  if not (select public.es_administrador_actual()) then
    raise exception 'No tienes permisos para eliminar regímenes de hotel.' using errcode = '42501';
  end if;

  delete from public.regimen_traducciones where regimen_id = p_regimen_id;
  delete from public.regimen where id = p_regimen_id returning id into deleted_id;
  return deleted_id is not null;
end;
$$;

revoke all on function public.eliminar_regimen_hotel(bigint) from public, anon;
grant execute on function public.eliminar_regimen_hotel(bigint) to authenticated;

notify pgrst, 'reload schema';
