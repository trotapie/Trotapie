alter table public.atracciones_imagenes
  add column if not exists efecto_destino text not null default 'fondo';

alter table public.atracciones_imagenes
  drop constraint if exists atracciones_imagenes_efecto_destino_check;

alter table public.atracciones_imagenes
  add constraint atracciones_imagenes_efecto_destino_check
    check (efecto_destino in ('fondo', 'texto', 'ambos'));
