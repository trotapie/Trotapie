-- Optional visual configuration keeps existing slides unchanged until edited.
alter table public.imagenes_fondo
  add column if not exists configuracion_visual jsonb not null default '{}'::jsonb;

alter table public.imagenes_fondo
  add constraint imagenes_fondo_configuracion_visual_object
  check (jsonb_typeof(configuracion_visual) = 'object');

comment on column public.imagenes_fondo.configuracion_visual is
  'Encuadre, posición, presentación de textos y traducciones de descripción/etiqueta del carrusel de inicio. Sin carpetas.';
