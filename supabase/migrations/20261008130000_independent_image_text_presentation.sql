begin;

alter table public.atracciones_imagenes
  add column if not exists titulo_presentacion jsonb,
  add column if not exists descripcion_presentacion jsonb;

-- Preserve each existing image's effects as separate configurations.
update public.atracciones_imagenes
set titulo_presentacion = coalesce(titulo_presentacion, jsonb_build_object(
      'oscurecer_fondo', coalesce(oscurecer_fondo, false),
      'efecto_activo', coalesce(efecto_destino in ('texto', 'ambos'), false),
      'overlay_color', coalesce(overlay_color, '#0F172A'),
      'overlay_opacidad', coalesce(overlay_opacidad, 0),
      'blur_px', coalesce(blur_px, 0)
    )),
    descripcion_presentacion = coalesce(descripcion_presentacion, jsonb_build_object(
      'oscurecer_fondo', coalesce(oscurecer_fondo, false),
      'efecto_activo', coalesce(efecto_destino in ('texto', 'ambos'), false),
      'overlay_color', coalesce(overlay_color, '#0F172A'),
      'overlay_opacidad', coalesce(overlay_opacidad, 0),
      'blur_px', coalesce(blur_px, 0)
    ))
where titulo_presentacion is null or descripcion_presentacion is null;

alter table public.atracciones_imagenes
  add constraint atracciones_imagenes_titulo_presentacion_check check (
    titulo_presentacion is null or (
      jsonb_typeof(titulo_presentacion) = 'object'
      and titulo_presentacion ?& array['oscurecer_fondo', 'efecto_activo', 'overlay_color', 'overlay_opacidad', 'blur_px']
      and jsonb_typeof(titulo_presentacion->'oscurecer_fondo') = 'boolean'
      and jsonb_typeof(titulo_presentacion->'efecto_activo') = 'boolean'
      and jsonb_typeof(titulo_presentacion->'overlay_color') = 'string'
      and (titulo_presentacion->>'overlay_color') ~ '^#[0-9A-Fa-f]{6}$'
      and jsonb_typeof(titulo_presentacion->'overlay_opacidad') = 'number'
      and (titulo_presentacion->>'overlay_opacidad')::numeric between 0 and 1
      and jsonb_typeof(titulo_presentacion->'blur_px') = 'number'
      and (titulo_presentacion->>'blur_px')::numeric between 0 and 24
    )
  ),
  add constraint atracciones_imagenes_descripcion_presentacion_check check (
    descripcion_presentacion is null or (
      jsonb_typeof(descripcion_presentacion) = 'object'
      and descripcion_presentacion ?& array['oscurecer_fondo', 'efecto_activo', 'overlay_color', 'overlay_opacidad', 'blur_px']
      and jsonb_typeof(descripcion_presentacion->'oscurecer_fondo') = 'boolean'
      and jsonb_typeof(descripcion_presentacion->'efecto_activo') = 'boolean'
      and jsonb_typeof(descripcion_presentacion->'overlay_color') = 'string'
      and (descripcion_presentacion->>'overlay_color') ~ '^#[0-9A-Fa-f]{6}$'
      and jsonb_typeof(descripcion_presentacion->'overlay_opacidad') = 'number'
      and (descripcion_presentacion->>'overlay_opacidad')::numeric between 0 and 1
      and jsonb_typeof(descripcion_presentacion->'blur_px') = 'number'
      and (descripcion_presentacion->>'blur_px')::numeric between 0 and 24
    )
  );

notify pgrst, 'reload schema';
commit;
