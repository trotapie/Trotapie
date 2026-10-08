begin;

-- Nullable positions preserve the layout of existing images.
alter table public.atracciones_imagenes
  add column if not exists titulo_color text,
  add column if not exists descripcion_color text,
  add column if not exists titulo_posicion text,
  add column if not exists titulo_x numeric(5,2),
  add column if not exists titulo_y numeric(5,2),
  add column if not exists descripcion_posicion text,
  add column if not exists descripcion_x numeric(5,2),
  add column if not exists descripcion_y numeric(5,2);

alter table public.atracciones_imagenes
  add constraint atracciones_imagenes_titulo_color_check check (titulo_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint atracciones_imagenes_descripcion_color_check check (descripcion_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint atracciones_imagenes_titulo_posicion_check check (titulo_posicion in (
    'top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right',
    'bottom-left', 'bottom-center', 'bottom-right', 'custom'
  )),
  add constraint atracciones_imagenes_descripcion_posicion_check check (descripcion_posicion in (
    'top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right',
    'bottom-left', 'bottom-center', 'bottom-right', 'custom'
  )),
  add constraint atracciones_imagenes_titulo_x_check check (titulo_x between 0 and 100),
  add constraint atracciones_imagenes_titulo_y_check check (titulo_y between 0 and 100),
  add constraint atracciones_imagenes_descripcion_x_check check (descripcion_x between 0 and 100),
  add constraint atracciones_imagenes_descripcion_y_check check (descripcion_y between 0 and 100);

notify pgrst, 'reload schema';
commit;
