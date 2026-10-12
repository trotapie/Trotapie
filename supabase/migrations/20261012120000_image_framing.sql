begin;

alter table public.atracciones_imagenes
  add column if not exists imagen_zoom numeric not null default 1 check (imagen_zoom between 1 and 3),
  add column if not exists imagen_x numeric not null default 50 check (imagen_x between 0 and 100),
  add column if not exists imagen_y numeric not null default 50 check (imagen_y between 0 and 100);

notify pgrst, 'reload schema';
commit;
