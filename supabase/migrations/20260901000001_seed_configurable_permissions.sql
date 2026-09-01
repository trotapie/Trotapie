-- Catalogo base de permisos configurables desde Administracion > Configuracion.
-- Las claves se conservan tecnicas para rutas y guards; la descripcion es la
-- etiqueta que se muestra a los administradores en la matriz de accesos.
WITH permisos_base(key, description) AS (
  VALUES
    ('dashboard.view', 'Ver panel principal'),

    ('cotizaciones.view', 'Ver todas las cotizaciones'),
    ('cotizaciones.own_view', 'Ver mis cotizaciones'),
    ('cotizaciones.create', 'Crear cotizaciones'),
    ('cotizaciones.edit', 'Editar cotizaciones'),
    ('cotizaciones.delete', 'Eliminar cotizaciones'),
    ('cotizaciones.send', 'Enviar cotizaciones'),
    ('cotizaciones.export', 'Exportar cotizaciones'),

    ('clientes.view', 'Ver clientes'),
    ('clientes.create', 'Crear clientes'),
    ('clientes.edit', 'Editar clientes'),

    ('destinos.view', 'Ver destinos'),
    ('destinos.create', 'Crear destinos'),
    ('destinos.edit', 'Editar destinos'),
    ('destinos.delete', 'Eliminar destinos'),
    ('destinos.publish', 'Publicar destinos'),
    ('destinos.images.manage', 'Administrar imagenes de destinos'),
    ('destinos.translations.manage', 'Administrar traducciones de destinos'),

    ('hoteles.view', 'Ver hoteles'),
    ('hoteles.create', 'Crear hoteles'),
    ('hoteles.edit', 'Editar hoteles'),
    ('hoteles.delete', 'Eliminar hoteles'),
    ('hoteles.rooms.manage', 'Administrar habitaciones'),
    ('hoteles.images.manage', 'Administrar imagenes de hoteles'),

    ('circuitos.view', 'Ver circuitos'),
    ('circuitos.create', 'Crear circuitos'),
    ('circuitos.edit', 'Editar circuitos'),
    ('circuitos.delete', 'Eliminar circuitos'),
    ('circuitos.publish', 'Publicar circuitos'),
    ('circuitos.flyers.manage', 'Administrar flyers de circuitos'),

    ('empleados.view', 'Ver empleados'),
    ('empleados.create', 'Crear empleados'),
    ('empleados.edit', 'Editar empleados'),
    ('empleados.deactivate', 'Desactivar empleados'),
    ('empleados.manage', 'Administrar empleados'),
    ('empleados.access.manage', 'Administrar accesos de empleados'),

    ('roles.manage', 'Administrar roles'),
    ('permissions.manage', 'Administrar permisos'),

    ('catalogos.view', 'Ver catalogos'),
    ('catalogos.manage', 'Administrar catalogos'),
    ('tarifas.manage', 'Administrar tarifas'),
    ('descuentos.manage', 'Administrar descuentos'),

    ('condiciones.view', 'Ver condiciones'),
    ('condiciones.edit', 'Editar condiciones'),
    ('condiciones.templates.manage', 'Administrar plantillas de condiciones'),
    ('condiciones.export', 'Imprimir o exportar condiciones'),
    ('condiciones.manage', 'Administrar condiciones'),

    ('reportes.view', 'Ver reportes'),
    ('reportes.export', 'Exportar reportes')
)
UPDATE public.permissions AS permission
SET description = permisos_base.description
FROM permisos_base
WHERE permission.key = permisos_base.key;

WITH permisos_base(key, description) AS (
  VALUES
    ('dashboard.view', 'Ver panel principal'),

    ('cotizaciones.view', 'Ver todas las cotizaciones'),
    ('cotizaciones.own_view', 'Ver mis cotizaciones'),
    ('cotizaciones.create', 'Crear cotizaciones'),
    ('cotizaciones.edit', 'Editar cotizaciones'),
    ('cotizaciones.delete', 'Eliminar cotizaciones'),
    ('cotizaciones.send', 'Enviar cotizaciones'),
    ('cotizaciones.export', 'Exportar cotizaciones'),

    ('clientes.view', 'Ver clientes'),
    ('clientes.create', 'Crear clientes'),
    ('clientes.edit', 'Editar clientes'),

    ('destinos.view', 'Ver destinos'),
    ('destinos.create', 'Crear destinos'),
    ('destinos.edit', 'Editar destinos'),
    ('destinos.delete', 'Eliminar destinos'),
    ('destinos.publish', 'Publicar destinos'),
    ('destinos.images.manage', 'Administrar imagenes de destinos'),
    ('destinos.translations.manage', 'Administrar traducciones de destinos'),

    ('hoteles.view', 'Ver hoteles'),
    ('hoteles.create', 'Crear hoteles'),
    ('hoteles.edit', 'Editar hoteles'),
    ('hoteles.delete', 'Eliminar hoteles'),
    ('hoteles.rooms.manage', 'Administrar habitaciones'),
    ('hoteles.images.manage', 'Administrar imagenes de hoteles'),

    ('circuitos.view', 'Ver circuitos'),
    ('circuitos.create', 'Crear circuitos'),
    ('circuitos.edit', 'Editar circuitos'),
    ('circuitos.delete', 'Eliminar circuitos'),
    ('circuitos.publish', 'Publicar circuitos'),
    ('circuitos.flyers.manage', 'Administrar flyers de circuitos'),

    ('empleados.view', 'Ver empleados'),
    ('empleados.create', 'Crear empleados'),
    ('empleados.edit', 'Editar empleados'),
    ('empleados.deactivate', 'Desactivar empleados'),
    ('empleados.manage', 'Administrar empleados'),
    ('empleados.access.manage', 'Administrar accesos de empleados'),

    ('roles.manage', 'Administrar roles'),
    ('permissions.manage', 'Administrar permisos'),

    ('catalogos.view', 'Ver catalogos'),
    ('catalogos.manage', 'Administrar catalogos'),
    ('tarifas.manage', 'Administrar tarifas'),
    ('descuentos.manage', 'Administrar descuentos'),

    ('condiciones.view', 'Ver condiciones'),
    ('condiciones.edit', 'Editar condiciones'),
    ('condiciones.templates.manage', 'Administrar plantillas de condiciones'),
    ('condiciones.export', 'Imprimir o exportar condiciones'),
    ('condiciones.manage', 'Administrar condiciones'),

    ('reportes.view', 'Ver reportes'),
    ('reportes.export', 'Exportar reportes')
)
INSERT INTO public.permissions (key, description)
SELECT permisos_base.key, permisos_base.description
FROM permisos_base
WHERE NOT EXISTS (
  SELECT 1
  FROM public.permissions AS permission
  WHERE permission.key = permisos_base.key
);
