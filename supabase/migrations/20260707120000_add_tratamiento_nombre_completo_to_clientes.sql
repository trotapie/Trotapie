alter table public.clientes
  add column if not exists tratamiento_id bigint references public.tratamientos(id) on delete set null,
  add column if not exists nombre_completo varchar(255);

update public.clientes
set nombre_completo = nombre
where nombre_completo is null
  and nombre is not null;

create index if not exists idx_clientes_tratamiento_id
  on public.clientes (tratamiento_id);
