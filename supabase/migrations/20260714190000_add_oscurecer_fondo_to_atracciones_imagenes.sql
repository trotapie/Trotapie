alter table public.atracciones_imagenes
  add column if not exists oscurecer_fondo boolean not null default false;
