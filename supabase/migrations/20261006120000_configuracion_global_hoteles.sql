-- Un solo registro global. Los horarios de hoteles siguen siendo overrides completos.
create or replace function public.configuracion_hoteles_valida(p_horarios jsonb, p_textos jsonb)
returns boolean language plpgsql immutable set search_path = public as $$
declare
  campo record;
  traduccion record;
begin
  if p_horarios is not null then
    if jsonb_typeof(p_horarios) <> 'object' then return false; end if;
    for campo in select * from jsonb_each(p_horarios) loop
      if campo.key not in ('check_in_desde', 'check_in_hasta', 'check_out', 'desayuno_desde', 'desayuno_hasta')
        or jsonb_typeof(campo.value) <> 'string'
        or (campo.value #>> '{}') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
        return false;
      end if;
    end loop;
  end if;
  if p_textos is null or jsonb_typeof(p_textos) <> 'object' then return false; end if;
  for traduccion in select * from jsonb_each(p_textos) loop
    if traduccion.key !~ '^[a-z]{2}(-[A-Za-z]{2})?$' or jsonb_typeof(traduccion.value) <> 'object' then
      return false;
    end if;
    for campo in select * from jsonb_each(traduccion.value) loop
      if campo.key not in ('titulo', 'destacado', 'mensaje') or jsonb_typeof(campo.value) <> 'string'
        or length(btrim(campo.value #>> '{}')) = 0
        or length(campo.value #>> '{}') > (case when campo.key = 'mensaje' then 500 else 120 end) then
        return false;
      end if;
    end loop;
  end loop;
  return true;
end;
$$;

create table public.configuracion_hoteles (
  id smallint primary key default 1 check (id = 1),
  horarios jsonb,
  textos jsonb not null default '{}'::jsonb,
  constraint configuracion_hoteles_contenido_valido check (public.configuracion_hoteles_valida(horarios, textos))
);

comment on table public.configuracion_hoteles is 'Configuración global única para las fichas públicas de todos los hoteles.';
comment on column public.configuracion_hoteles.horarios is 'Horarios HH:mm usados solo cuando el hotel no tiene horarios específicos. NULL significa sin horarios generales.';
comment on column public.configuracion_hoteles.textos is 'Textos del encabezado por código de idioma: titulo, destacado y mensaje.';

insert into public.configuracion_hoteles (id, horarios, textos) values (1, null, '{
  "es": {"titulo": "Información del hotel", "destacado": "Descubre más", "mensaje": "Cuidar cada detalle de tus viajes de lujo es sencillo."},
  "en": {"titulo": "Hotel information", "destacado": "Discover more", "mensaje": "Taking care of every detail of your luxury travels is simple."},
  "fr": {"titulo": "Informations sur l’hôtel", "destacado": "En savoir plus", "mensaje": "Prendre soin de chaque détail de vos voyages de luxe est simple."},
  "pt": {"titulo": "Informações do hotel", "destacado": "Descubra mais", "mensaje": "Cuidar de cada detalhe das suas viagens de luxo é simples."},
  "de": {"titulo": "Hotelinformationen", "destacado": "Mehr entdecken", "mensaje": "Jedes Detail Ihrer Luxusreise zu berücksichtigen ist ganz einfach."}
}'::jsonb);

alter table public.configuracion_hoteles enable row level security;
revoke all on public.configuracion_hoteles from anon, authenticated;
grant select on public.configuracion_hoteles to anon, authenticated;
grant update (horarios, textos) on public.configuracion_hoteles to authenticated;

create policy configuracion_hoteles_lectura on public.configuracion_hoteles
for select to anon, authenticated using (true);
create policy configuracion_hoteles_edicion_admin on public.configuracion_hoteles
for update to authenticated
using (public.es_administrador_actual())
with check (public.es_administrador_actual());
