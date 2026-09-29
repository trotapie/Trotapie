-- Allow a hotel to remain available without a primary regimen.
alter table public.hoteles alter column regimen_id drop not null;

-- Keep the whole operation atomic: if another reference prevents deletion,
-- the changes to hotels and translations are rolled back too.
create or replace function public.eliminar_regimen_hotel(p_regimen_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.es_administrador_actual()) then
    raise exception 'No tienes permisos para eliminar regímenes de hotel.' using errcode = '42501';
  end if;

  perform 1 from public.regimen where id = p_regimen_id for update;
  if not found then
    return false;
  end if;

  update public.hoteles set regimen_id = null where regimen_id = p_regimen_id;
  delete from public.regimen_hotel where regimen_id = p_regimen_id;
  delete from public.regimen_traducciones where regimen_id = p_regimen_id;
  delete from public.regimen where id = p_regimen_id;
  return true;
end;
$$;

revoke all on function public.eliminar_regimen_hotel(bigint) from public, anon;
grant execute on function public.eliminar_regimen_hotel(bigint) to authenticated;

notify pgrst, 'reload schema';
