alter table if exists public.atracciones_imagenes
  add column if not exists carpeta text null;
