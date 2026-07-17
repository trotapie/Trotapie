alter table public.empleados
  add column if not exists cargo_id bigint;

update public.empleados as e
set cargo_id = r.id
from public.roles_empresa as r
where e.cargo_id is null
  and e.cargo is not null
  and lower(trim(e.cargo)) = lower(trim(r.rol));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'empleados_cargo_id_fkey'
      and conrelid = 'public.empleados'::regclass
  ) then
    alter table public.empleados
      add constraint empleados_cargo_id_fkey
      foreign key (cargo_id) references public.roles_empresa(id)
      on update cascade
      on delete set null;
  end if;
end $$;

create index if not exists empleados_cargo_id_idx
  on public.empleados (cargo_id);

create or replace function public.obtener_empleado_firma_por_cotizacion_publica(
  p_public_id uuid
)
returns table (
  nombre text,
  cargo text,
  email text,
  telefono text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.nombre::text,
    nullif(trim(r.rol), '')::text,
    e.email::text,
    e.telefono::text
  from public.solicitudes_cotizacion as s
  join public.empleados as e on e.id = s.empleado_id
  left join public.roles_empresa as r on r.id = e.cargo_id
  where s.public_id = p_public_id
  limit 1;
$$;

grant execute on function public.obtener_empleado_firma_por_cotizacion_publica(uuid) to anon, authenticated;

alter table public.empleados
  drop column if exists cargo;
