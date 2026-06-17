begin;

insert into public.atracciones_imagenes (
  atraccion_id,
  imagen_url,
  carpeta,
  activa,
  orden,
  vigencia_desde,
  vigencia_hasta
)
select
  50,
  v.imagen_url,
  'general',
  false,
  v.orden,
  null,
  null
from (
  values
    (
      'https://plus.unsplash.com/premium_photo-1780474533115-8a32887aec51?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      1
    ),
    (
      'https://plus.unsplash.com/premium_photo-1749066209388-d56e46dbe8e5?q=80&w=688&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      2
    ),
    (
      'https://images.unsplash.com/photo-1780833555451-6f0b0b5e47bd?q=80&w=1175&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      3
    )
) as v(imagen_url, orden)
where exists (
  select 1
  from public.atracciones_principales ap
  where ap.id = 50
)
and not exists (
  select 1
  from public.atracciones_imagenes ai
  where ai.atraccion_id = 50
    and ai.imagen_url = v.imagen_url
);

-- Desactivar cualquier imagen activa anterior
update public.atracciones_imagenes
set activa = false
where atraccion_id = 50;

-- Activar solo la imagen orden 1
update public.atracciones_imagenes
set activa = true
where atraccion_id = 50
  and orden = 1;

commit;