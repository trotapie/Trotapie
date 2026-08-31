alter table public.atracciones_imagenes
  add column if not exists etiqueta_texto text,
  add column if not exists overlay_posicion text not null default 'bottom-left',
  add column if not exists overlay_x numeric(5,2),
  add column if not exists overlay_y numeric(5,2);

alter table public.atracciones_imagenes
  drop constraint if exists atracciones_imagenes_overlay_posicion_check;

alter table public.atracciones_imagenes
  add constraint atracciones_imagenes_overlay_posicion_check
  check (overlay_posicion in (
    'top-left', 'top-center', 'top-right',
    'center-left', 'center', 'center-right',
    'bottom-left', 'bottom-center', 'bottom-right',
    'custom'
  ));

alter table public.atracciones_imagenes
  drop constraint if exists atracciones_imagenes_overlay_x_check,
  drop constraint if exists atracciones_imagenes_overlay_y_check;

alter table public.atracciones_imagenes
  add constraint atracciones_imagenes_overlay_x_check
  check (overlay_x is null or overlay_x between 0 and 100),
  add constraint atracciones_imagenes_overlay_y_check
  check (overlay_y is null or overlay_y between 0 and 100);
