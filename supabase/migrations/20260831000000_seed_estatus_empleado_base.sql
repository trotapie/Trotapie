insert into public.estatus_empleado (clave, nombre, activo, orden)
select 'activo', 'Activo', true, 1
where not exists (
  select 1
  from public.estatus_empleado
  where lower(clave) = 'activo'
);

insert into public.estatus_empleado (clave, nombre, activo, orden)
select 'inactivo', 'Inactivo', true, 2
where not exists (
  select 1
  from public.estatus_empleado
  where lower(clave) = 'inactivo'
);
