-- Soft-deleted quotes use the shared quotation status catalog.
insert into public.estatus_cotizacion (clave, nombre, activo, orden)
select
  'eliminado',
  'Eliminado',
  true,
  coalesce((select max(orden) from public.estatus_cotizacion), 0) + 1
where not exists (
  select 1
  from public.estatus_cotizacion
  where lower(clave) = 'eliminado'
);
