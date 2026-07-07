alter table public.tratamientos
  add column if not exists estatus boolean not null default true;

alter table public.origen_reservacion
  add column if not exists estatus boolean not null default true;

alter table public.roles_empresa
  add column if not exists estatus boolean not null default true;
