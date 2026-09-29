-- Editing a regimen updates its Spanish description and upserts its translations.
grant update on public.regimen to authenticated;
grant update on public.regimen_traducciones to authenticated;

drop policy if exists regimen_admin_update on public.regimen;
create policy regimen_admin_update on public.regimen
  for update to authenticated
  using ((select public.es_administrador_actual()))
  with check ((select public.es_administrador_actual()));

drop policy if exists regimen_traducciones_admin_update on public.regimen_traducciones;
create policy regimen_traducciones_admin_update on public.regimen_traducciones
  for update to authenticated
  using ((select public.es_administrador_actual()))
  with check ((select public.es_administrador_actual()));

notify pgrst, 'reload schema';
