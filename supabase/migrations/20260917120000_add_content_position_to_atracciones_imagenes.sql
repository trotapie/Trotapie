alter table public.atracciones_imagenes
  add column if not exists contenido_posicion text not null default 'bottom-left',
  add column if not exists contenido_x numeric(5,2),
  add column if not exists contenido_y numeric(5,2);

alter table public.atracciones_imagenes
  drop constraint if exists atracciones_imagenes_contenido_posicion_check;

alter table public.atracciones_imagenes
  add constraint atracciones_imagenes_contenido_posicion_check
  check (contenido_posicion in (
    'top-left', 'top-center', 'top-right',
    'center-left', 'center', 'center-right',
    'bottom-left', 'bottom-center', 'bottom-right',
    'custom'
  ));

alter table public.atracciones_imagenes
  drop constraint if exists atracciones_imagenes_contenido_x_check,
  drop constraint if exists atracciones_imagenes_contenido_y_check;

alter table public.atracciones_imagenes
  add constraint atracciones_imagenes_contenido_x_check
  check (contenido_x is null or contenido_x between 0 and 100),
  add constraint atracciones_imagenes_contenido_y_check
  check (contenido_y is null or contenido_y between 0 and 100);
