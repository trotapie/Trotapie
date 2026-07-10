alter table if exists public.empleados
  add column if not exists cargo text,
  add column if not exists telefono text;
