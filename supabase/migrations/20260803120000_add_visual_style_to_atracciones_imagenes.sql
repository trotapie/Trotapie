alter table public.atracciones_imagenes
  add column if not exists texto_color text not null default '#FFFFFF',
  add column if not exists titulo_font_size smallint not null default 48,
  add column if not exists descripcion_font_size smallint not null default 18,
  add column if not exists overlay_color text not null default '#0F172A',
  add column if not exists overlay_opacidad numeric(3,2) not null default 0,
  add column if not exists blur_px smallint not null default 0;

alter table public.atracciones_imagenes
  drop constraint if exists atracciones_imagenes_overlay_opacidad_check,
  drop constraint if exists atracciones_imagenes_blur_px_check,
  drop constraint if exists atracciones_imagenes_titulo_font_size_check,
  drop constraint if exists atracciones_imagenes_descripcion_font_size_check;

alter table public.atracciones_imagenes
  add constraint atracciones_imagenes_overlay_opacidad_check
    check (overlay_opacidad between 0 and 1),
  add constraint atracciones_imagenes_blur_px_check
    check (blur_px between 0 and 24),
  add constraint atracciones_imagenes_titulo_font_size_check
    check (titulo_font_size between 24 and 72),
  add constraint atracciones_imagenes_descripcion_font_size_check
    check (descripcion_font_size between 14 and 32);
