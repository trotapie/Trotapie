begin;

alter table public.atracciones_imagenes
  drop constraint if exists atracciones_imagenes_imagen_zoom_check;

alter table public.atracciones_imagenes
  add constraint atracciones_imagenes_imagen_zoom_check
  check (imagen_zoom between 0.1 and 3);

notify pgrst, 'reload schema';
commit;
