alter table public.atracciones_imagenes
  add column if not exists etiqueta_font_size smallint not null default 12;

alter table public.atracciones_imagenes
  drop constraint if exists atracciones_imagenes_etiqueta_font_size_check;

alter table public.atracciones_imagenes
  add constraint atracciones_imagenes_etiqueta_font_size_check
    check (etiqueta_font_size between 8 and 32);
