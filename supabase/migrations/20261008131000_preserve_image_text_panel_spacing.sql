begin;

-- Keep text positions stable when changing only the image's presentation.
alter table public.atracciones_imagenes
  add column if not exists contenido_panel_espaciado boolean;

update public.atracciones_imagenes
set contenido_panel_espaciado = coalesce(oscurecer_fondo, false)
  or coalesce(efecto_destino in ('texto', 'ambos'), false)
where contenido_panel_espaciado is null;

notify pgrst, 'reload schema';
commit;
