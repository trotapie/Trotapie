import { Routes } from '@angular/router';
import { AdminComponent } from './admin.component';
import { AdminHotelesComponent } from './hoteles/admin-hoteles.component';
import { EditarHotelComponent } from './hoteles/editar-hotel/editar-hotel.component';
import { AdminActividadesComponent } from './actividades/admin-actividades.component';
import { SolicitudesCotizacionComponent } from './solicitudes-cotizacion/solicitudes-cotizacion.component';
import { CotizacionComponent } from './solicitudes-cotizacion/cotizacion/cotizacion.component';
import { CrearCotizacionComponent } from './solicitudes-cotizacion/crear-cotizacion/crear-cotizacion.component';
import { CotizacionesMultiplesComponent } from './cotizaciones-multiples/cotizaciones-multiples.component';
import { CotizacionMultipleComponent } from './cotizacion-multiple/cotizacion-multiple.component';
import { DestinosComponent } from './destinos/destinos/destinos.component';
import { ConfiguracionDestinosComponent } from './destinos/configuracion-destinos/configuracion-destinos.component';
import { TipoDestinosComponent } from './destinos/tipo-destinos/tipo-destinos.component';
import { EditarDestinoComponent } from './destinos/editar-destino/editar-destino.component';
import { EditarPreviewDestinoComponent } from './destinos/editar-preview-destino/editar-preview-destino.component';
import { EditarActividadDestinoComponent } from './destinos/editar-actividad-destino/editar-actividad-destino.component';
import { CatalogoPlaceholderComponent } from './catalogos/catalogo-placeholder/catalogo-placeholder.component';
import { AtraccionesDetalleComponent } from './catalogos/atracciones-detalle/atracciones-detalle.component';
import { EmpleadosComponent } from './empleados/empleados.component';
import { ConfiguracionAdminComponent } from './configuracion/configuracion.component';
import { PermisosAdminComponent } from './configuracion/permisos/permisos.component';
import { RolesAdminComponent } from './configuracion/roles/roles.component';

const ADMIN_ONLY = { roles: ['admin'] };
const HOTELES_VIEW = { permissions: ['hoteles.view'] };
const HOTELES_EDIT = { permissions: ['hoteles.edit'] };
const DESTINOS_VIEW = { permissions: ['destinos.view'] };
const DESTINOS_EDIT = { permissions: ['destinos.edit'] };
const COTIZACIONES_VIEW = { permissions: ['cotizaciones.view'] };
const COTIZACIONES_EDIT = { permissions: ['cotizaciones.edit'] };
const COTIZACIONES_CREATE = { permissions: ['cotizaciones.create'] };
const EMPLEADOS_MANAGE = { permissions: ['empleados.manage'] };

export default [
    {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
    },
    {
        path: 'dashboard',
        component: AdminComponent,
    },
    {
        path: 'hoteles',
        component: AdminHotelesComponent,
        data: HOTELES_VIEW,
    },
    {
        path: 'hoteles/editar/:id',
        component: EditarHotelComponent,
        data: HOTELES_EDIT,
    },
    {
        path: 'catalogos',
        component: AdminActividadesComponent,
        data: ADMIN_ONLY,
    },
    {
        path: 'actividades',
        redirectTo: 'catalogos',
        pathMatch: 'full',
    },
    {
        path: 'amenidades',
        redirectTo: 'catalogos',
        pathMatch: 'full',
    },
    {
        path: 'catalogos/actividades',
        redirectTo: 'catalogos/amenidades',
        pathMatch: 'full',
    },
    {
        path: 'catalogos/amenidades',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'actividades',
            titulo: 'Catalogo de amenidades',
            descripcion: 'Gestiona el catalogo de amenidades disponible para la operacion.'
        }
    },
    {
        path: 'catalogos/conceptos',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'conceptos',
            titulo: 'Conceptos',
            descripcion: 'Administra conceptos utilizados por hoteles y cotizaciones.'
        }
    },
    {
        path: 'catalogos/continentes',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'continentes',
            titulo: 'Continentes',
            descripcion: 'Gestiona continentes para clasificar destinos internacionales.'
        }
    },
    {
        path: 'catalogos/descuentos',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'descuentos',
            titulo: 'Descuentos',
            descripcion: 'Administra los descuentos disponibles dentro del sistema.'
        }
    },
    {
        path: 'catalogos/estatus-empleado',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'estatus_empleado',
            titulo: 'Estatus de empleado',
            descripcion: 'Gestiona estatus disponibles para empleados del sistema.'
        }
    },
    {
        path: 'catalogos/estatus-cotizacion',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'estatus_cotizacion',
            titulo: 'Estatus de cotizacion',
            descripcion: 'Gestiona estatus disponibles para solicitudes de cotizacion.'
        }
    },
    {
        path: 'catalogos/idiomas',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'idiomas',
            titulo: 'Idiomas',
            descripcion: 'Gestiona idiomas disponibles para contenidos y traducciones.'
        }
    },
    {
        path: 'catalogos/politicas',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'politicas',
            titulo: 'Politicas',
            descripcion: 'Administra politicas de reservacion y reglas operativas.'
        }
    },
    {
        path: 'catalogos/regimen-hotel',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'regimen_hotel',
            titulo: 'Regimen de hotel',
            descripcion: 'Gestiona regimenes asociados a hoteles y sus descripciones.'
        }
    },
    {
        path: 'catalogos/tarifas',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'tarifas',
            titulo: 'Tarifas',
            descripcion: 'Administra las tarifas utilizadas en cotizaciones y ventas.'
        }
    },
    {
        path: 'catalogos/tipo-imagen',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'tipo_imagen',
            titulo: 'Tipo imagen',
            descripcion: 'Gestiona tipos de imagen para clasificar contenido visual.'
        }
    },
    {
        path: 'catalogos/tipos-habitacion',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'tipos_habitacion',
            titulo: 'Tipos habitacion',
            descripcion: 'Administra tipos de habitacion para hoteles y cotizaciones.'
        }
    },
    {
        path: 'catalogos/atracciones',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'atracciones',
            titulo: 'Catalogo de atracciones',
            descripcion: 'Gestiona atracciones principales vinculadas a destinos.'
        }
    },
    {
        path: 'catalogos/atracciones/editar/:id',
        component: AtraccionesDetalleComponent,
        data: ADMIN_ONLY
    },
    {
        path: 'solicitudes-cotizacion',
        component: SolicitudesCotizacionComponent,
        data: COTIZACIONES_VIEW,
    },
    {
        path: 'cotizaciones-multiples',
        component: CotizacionesMultiplesComponent,
        data: COTIZACIONES_VIEW,
    },
    {
        path: 'empleados',
        component: EmpleadosComponent,
        data: EMPLEADOS_MANAGE,
    },
    {
        path: 'configuracion',
        component: ConfiguracionAdminComponent,
        data: EMPLEADOS_MANAGE,
    },
    {
        path: 'configuracion/permisos',
        component: PermisosAdminComponent,
        data: EMPLEADOS_MANAGE,
    },
    {
        path: 'configuracion/roles',
        component: RolesAdminComponent,
        data: EMPLEADOS_MANAGE,
    },
    {
        path: 'solicitudes-cotizacion/nueva',
        component: CrearCotizacionComponent,
        data: COTIZACIONES_CREATE,
    },
    {
        path: 'cotizaciones-multiples/nueva',
        component: CotizacionMultipleComponent,
        data: COTIZACIONES_CREATE,
    },
    {
        path: 'cotizacion-multiple',
        redirectTo: 'cotizaciones-multiples/nueva',
        pathMatch: 'full',
    },
    {
        path: 'edicion-cotizacion/:id',
        component: CotizacionComponent,
        data: COTIZACIONES_EDIT,
    },
    {
        path: 'destinos',
        component: ConfiguracionDestinosComponent,
        data: DESTINOS_VIEW,
    },
    {
        path: 'destinos/configurar-tipos-destinos',
        component: TipoDestinosComponent,
        data: DESTINOS_EDIT,
    },
    {
        path: 'destinos/configurar-destinos',
        component: DestinosComponent,
        data: DESTINOS_VIEW,
    },
    {
        path: 'destinos/configurar-destinos/editar/:id',
        component: EditarDestinoComponent,
        data: DESTINOS_EDIT,
    },
    {
        path: 'destinos/configurar-destinos/preview/:id',
        component: EditarPreviewDestinoComponent,
        data: DESTINOS_VIEW,
    },
    {
        path: 'destinos/configurar-destinos/preview/:id/actividad/:actividadId',
        component: EditarActividadDestinoComponent,
        data: DESTINOS_VIEW,
    },
    {
        path: 'destinos/configurar-destinos/nuevo',
        component: EditarDestinoComponent,
        data: DESTINOS_EDIT,
    },

] as Routes;
