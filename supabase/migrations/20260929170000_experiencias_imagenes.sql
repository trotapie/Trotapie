-- Imágenes públicas para el catálogo de cabañas y promociones.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('experiencias', 'experiencias', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy experiencias_imagenes_admin_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'experiencias'
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );
