-- Relaciona cada detalle configurado con el destino del catalogo administrativo.
alter table public.detalles_destinos
  add column if not exists catalogo_destino_id bigint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'detalles_destinos_catalogo_destino_id_fkey'
      and conrelid = 'public.detalles_destinos'::regclass
  ) then
    alter table public.detalles_destinos
      add constraint detalles_destinos_catalogo_destino_id_fkey
      foreign key (catalogo_destino_id)
      references public.catalogo_destinos(id)
      on delete restrict;
  end if;
end $$;

create unique index if not exists detalles_destinos_catalogo_destino_id_unique
  on public.detalles_destinos (catalogo_destino_id)
  where catalogo_destino_id is not null;
