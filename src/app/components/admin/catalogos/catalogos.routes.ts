import { Routes } from '@angular/router';
import { AdminActividadesComponent } from '../actividades/admin-actividades.component';
import { CatalogoPlaceholderComponent } from './catalogo-placeholder/catalogo-placeholder.component';
import { AtraccionesDetalleComponent } from './atracciones-detalle/atracciones-detalle.component';

const ADMIN_ONLY = { roles: ['admin'] };

export default [
    {
        path: '',
        component: AdminActividadesComponent,
        data: ADMIN_ONLY,
    },
    {
        path: 'actividades',
        redirectTo: 'amenidades',
        pathMatch: 'full',
    },
    {
        path: 'amenidades',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'actividades',
            titulo: 'Catalogo de amenidades',
            descripcion: 'Gestiona el catalogo de amenidades disponible para la operacion.'
        }
    },
    {
        path: 'conceptos',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'conceptos',
            titulo: 'Conceptos',
            descripcion: 'Administra conceptos utilizados por hoteles y cotizaciones.'
        }
    },
    {
        path: 'continentes',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'continentes',
            titulo: 'Continentes',
            descripcion: 'Gestiona continentes para clasificar destinos internacionales.'
        }
    },
    {
        path: 'descuentos',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'descuentos',
            titulo: 'Descuentos',
            descripcion: 'Administra los descuentos disponibles dentro del sistema.'
        }
    },
    {
        path: 'estatus-empleado',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'estatus_empleado',
            titulo: 'Estatus de empleado',
            descripcion: 'Gestiona estatus disponibles para empleados del sistema.'
        }
    },
    {
        path: 'estatus-cotizacion',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'estatus_cotizacion',
            titulo: 'Estatus de cotizacion',
            descripcion: 'Gestiona estatus disponibles para solicitudes de cotizacion.'
        }
    },
    {
        path: 'idiomas',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'idiomas',
            titulo: 'Idiomas',
            descripcion: 'Gestiona idiomas disponibles para contenidos y traducciones.'
        }
    },
    {
        path: 'politicas',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'politicas',
            titulo: 'Politicas',
            descripcion: 'Administra politicas de reservacion y reglas operativas.'
        }
    },
    {
        path: 'origen-reservacion',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'origen_reservacion',
            titulo: 'Origen de reservacion',
            descripcion: 'Gestiona claves y nombres de cotizador para identificar el origen de cada reservacion.'
        }
    },
    {
        path: 'roles-empresa',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'roles_empresa',
            titulo: 'Puestos o roles de la empresa',
            descripcion: 'Gestiona roles internos como CEO, Director o Isla y su descripcion operativa.'
        }
    },
    {
        path: 'regimen-hotel',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'regimen_hotel',
            titulo: 'Regimen de hotel',
            descripcion: 'Gestiona regimenes asociados a hoteles y sus descripciones.'
        }
    },
    {
        path: 'tarifas',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'tarifas',
            titulo: 'Tarifas',
            descripcion: 'Administra las tarifas utilizadas en cotizaciones y ventas.'
        }
    },
    {
        path: 'tipo-imagen',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'tipo_imagen',
            titulo: 'Tipo imagen',
            descripcion: 'Gestiona tipos de imagen para clasificar contenido visual.'
        }
    },
    {
        path: 'tipos-habitacion',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'tipos_habitacion',
            titulo: 'Tipos habitacion',
            descripcion: 'Administra tipos de habitacion para hoteles y cotizaciones.'
        }
    },
    {
        path: 'atracciones',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'atracciones',
            titulo: 'Catalogo de atracciones',
            descripcion: 'Gestiona atracciones principales vinculadas a destinos.'
        }
    },
    {
        path: 'tratamientos',
        component: CatalogoPlaceholderComponent,
        data: {
            ...ADMIN_ONLY,
            catalogoKey: 'tratamientos',
            titulo: 'Titulos y tratamientos',
            descripcion: 'Gestiona titulos y tratamientos disponibles para clientes, solicitudes y cotizaciones.'
        }
    },
    {
        path: 'atracciones/editar/:id',
        component: AtraccionesDetalleComponent,
        data: ADMIN_ONLY
    },
] as Routes;
