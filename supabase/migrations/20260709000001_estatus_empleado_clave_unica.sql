create unique index if not exists estatus_empleado_clave_unique
  on public.estatus_empleado (lower(clave));
