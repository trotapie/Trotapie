create table if not exists public.hotel_detalle_secciones (
  id uuid primary key default gen_random_uuid(),
  hotel_id bigint not null references public.hoteles(id) on delete cascade,
  orden integer not null default 0 check (orden >= 0),
  icono text not null default 'article' check (icono in ('article', 'schedule', 'local_offer', 'info', 'restaurant', 'star')),
  visible boolean not null default true
);

create index if not exists hotel_detalle_secciones_hotel_orden_idx on public.hotel_detalle_secciones (hotel_id, orden);

create table if not exists public.hotel_detalle_secciones_traducciones (
  seccion_id uuid not null references public.hotel_detalle_secciones(id) on delete cascade,
  idioma_id bigint not null references public.idiomas(id),
  titulo text not null check (length(trim(titulo)) > 0),
  contenido_html text not null default '',
  bloques jsonb not null default '[]'::jsonb check (jsonb_typeof(bloques) = 'array'),
  primary key (seccion_id, idioma_id)
);

grant select on public.hotel_detalle_secciones, public.hotel_detalle_secciones_traducciones to anon, authenticated;
grant insert, update, delete on public.hotel_detalle_secciones, public.hotel_detalle_secciones_traducciones to authenticated;

alter table public.hotel_detalle_secciones enable row level security;
alter table public.hotel_detalle_secciones_traducciones enable row level security;

drop policy if exists hotel_detalle_secciones_read on public.hotel_detalle_secciones;
create policy hotel_detalle_secciones_read on public.hotel_detalle_secciones
  for select to anon, authenticated
  using (visible);
drop policy if exists hotel_detalle_secciones_admin_read on public.hotel_detalle_secciones;
create policy hotel_detalle_secciones_admin_read on public.hotel_detalle_secciones
  for select to authenticated using ((select public.es_administrador_actual()));
drop policy if exists hotel_detalle_secciones_write on public.hotel_detalle_secciones;
create policy hotel_detalle_secciones_write on public.hotel_detalle_secciones
  for all to authenticated
  using ((select public.es_administrador_actual()))
  with check ((select public.es_administrador_actual()));

drop policy if exists hotel_detalle_traducciones_read on public.hotel_detalle_secciones_traducciones;
create policy hotel_detalle_traducciones_read on public.hotel_detalle_secciones_traducciones
  for select to anon, authenticated
  using (exists (
    select 1 from public.hotel_detalle_secciones s
    where s.id = hotel_detalle_secciones_traducciones.seccion_id
  ));
drop policy if exists hotel_detalle_traducciones_write on public.hotel_detalle_secciones_traducciones;
create policy hotel_detalle_traducciones_write on public.hotel_detalle_secciones_traducciones
  for all to authenticated
  using ((select public.es_administrador_actual()))
  with check ((select public.es_administrador_actual()));

-- Una sola transacción para altas, ediciones, traducciones y eliminaciones.
create or replace function public.guardar_hotel_detalle_secciones(p_hotel_id bigint, p_secciones jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare
  seccion jsonb;
  traduccion jsonb;
  v_seccion_id uuid;
  ids uuid[] := '{}'::uuid[];
begin
  if not (select public.es_administrador_actual()) then
    raise exception 'No autorizado';
  end if;
  if jsonb_typeof(p_secciones) is distinct from 'array' then
    raise exception 'Secciones invalidas';
  end if;

  for seccion in select value from jsonb_array_elements(p_secciones) loop
    v_seccion_id := (seccion->>'id')::uuid;
    if v_seccion_id = any(ids) then
      raise exception 'Seccion duplicada';
    end if;
    if exists (select 1 from public.hotel_detalle_secciones where id = v_seccion_id and hotel_id <> p_hotel_id) then
      raise exception 'La seccion pertenece a otro hotel';
    end if;
    ids := array_append(ids, v_seccion_id);
    insert into public.hotel_detalle_secciones (id, hotel_id, orden, icono, visible)
    values (v_seccion_id, p_hotel_id, (seccion->>'orden')::integer, seccion->>'icono', (seccion->>'visible')::boolean)
    on conflict (id) do update set orden = excluded.orden, icono = excluded.icono, visible = excluded.visible;

    for traduccion in select value from jsonb_array_elements(seccion->'traducciones') loop
      insert into public.hotel_detalle_secciones_traducciones
        (seccion_id, idioma_id, titulo, contenido_html, bloques)
      values (v_seccion_id, (traduccion->>'idioma_id')::bigint, traduccion->>'titulo',
        traduccion->>'contenido_html', traduccion->'bloques')
      on conflict (seccion_id, idioma_id) do update set
        titulo = excluded.titulo, contenido_html = excluded.contenido_html, bloques = excluded.bloques;
    end loop;
  end loop;

  delete from public.hotel_detalle_secciones where hotel_id = p_hotel_id and not (id = any(ids));
end;
$$;

revoke all on function public.guardar_hotel_detalle_secciones(bigint, jsonb) from public;
grant execute on function public.guardar_hotel_detalle_secciones(bigint, jsonb) to authenticated;

notify pgrst, 'reload schema';
