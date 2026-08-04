alter table public.atracciones_imagenes
  add column if not exists etiqueta_color text not null default '#F9B44B';
