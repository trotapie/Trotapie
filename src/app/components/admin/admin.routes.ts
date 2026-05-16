import { Routes } from '@angular/router';
import { AdminComponent } from './admin.component';
import { AdminHotelesComponent } from './hoteles/admin-hoteles.component';
import { AdminActividadesComponent } from './actividades/admin-actividades.component';
import { SolicitudesCotizacionComponent } from './solicitudes-cotizacion/solicitudes-cotizacion.component';
import { CotizacionComponent } from './solicitudes-cotizacion/cotizacion/cotizacion.component';
import { DestinosComponent } from './destinos/destinos/destinos.component';
import { ConfiguracionDestinosComponent } from './destinos/configuracion-destinos/configuracion-destinos.component';
import { TipoDestinosComponent } from './destinos/tipo-destinos/tipo-destinos.component';
import { EditarDestinoComponent } from './destinos/editar-destino/editar-destino.component';
import { EditarPreviewDestinoComponent } from './destinos/editar-preview-destino/editar-preview-destino.component';
import { CatalogoPlaceholderComponent } from './catalogos/catalogo-placeholder/catalogo-placeholder.component';
import { AtraccionesDetalleComponent } from './catalogos/atracciones-detalle/atracciones-detalle.component';

export default [
    {
        path: '',
        component: AdminComponent,
    },
    {
        path: 'hoteles',
        component: AdminHotelesComponent,
    },
    {
        path: 'catalogos',
        component: AdminActividadesComponent,
    },
    {
        path: 'actividades',
        redirectTo: 'catalogos',
        pathMatch: 'full',
    },
    {
        path: 'catalogos/actividades',
        component: CatalogoPlaceholderComponent,
        data: {
            catalogoKey: 'actividades',
            titulo: 'Catalogo de actividades',
            descripcion: 'Gestiona el catalogo de actividades disponible para la operacion.'
        }
    },
    {
        path: 'catalogos/conceptos',
        component: CatalogoPlaceholderComponent,
        data: {
            catalogoKey: 'conceptos',
            titulo: 'Conceptos',
            descripcion: 'Administra conceptos utilizados por hoteles y cotizaciones.'
        }
    },
    {
        path: 'catalogos/continentes',
        component: CatalogoPlaceholderComponent,
        data: {
            catalogoKey: 'continentes',
            titulo: 'Continentes',
            descripcion: 'Gestiona continentes para clasificar destinos internacionales.'
        }
    },
    {
        path: 'catalogos/descuentos',
        component: CatalogoPlaceholderComponent,
        data: {
            catalogoKey: 'descuentos',
            titulo: 'Descuentos',
            descripcion: 'Administra los descuentos disponibles dentro del sistema.'
        }
    },
    {
        path: 'catalogos/idiomas',
        component: CatalogoPlaceholderComponent,
        data: {
            catalogoKey: 'idiomas',
            titulo: 'Idiomas',
            descripcion: 'Gestiona idiomas disponibles para contenidos y traducciones.'
        }
    },
    {
        path: 'catalogos/politicas',
        component: CatalogoPlaceholderComponent,
        data: {
            catalogoKey: 'politicas',
            titulo: 'Politicas',
            descripcion: 'Administra politicas de reservacion y reglas operativas.'
        }
    },
    {
        path: 'catalogos/regimen-hotel',
        component: CatalogoPlaceholderComponent,
        data: {
            catalogoKey: 'regimen_hotel',
            titulo: 'Regimen de hotel',
            descripcion: 'Gestiona regimenes asociados a hoteles y sus descripciones.'
        }
    },
    {
        path: 'catalogos/tarifas',
        component: CatalogoPlaceholderComponent,
        data: {
            catalogoKey: 'tarifas',
            titulo: 'Tarifas',
            descripcion: 'Administra las tarifas utilizadas en cotizaciones y ventas.'
        }
    },
    {
        path: 'catalogos/tipo-imagen',
        component: CatalogoPlaceholderComponent,
        data: {
            catalogoKey: 'tipo_imagen',
            titulo: 'Tipo imagen',
            descripcion: 'Gestiona tipos de imagen para clasificar contenido visual.'
        }
    },
    {
        path: 'catalogos/tipos-habitacion',
        component: CatalogoPlaceholderComponent,
        data: {
            catalogoKey: 'tipos_habitacion',
            titulo: 'Tipos habitacion',
            descripcion: 'Administra tipos de habitacion para hoteles y cotizaciones.'
        }
    },
    {
        path: 'catalogos/atracciones',
        component: CatalogoPlaceholderComponent,
        data: {
            catalogoKey: 'atracciones',
            titulo: 'Catalogo de atracciones',
            descripcion: 'Gestiona atracciones principales vinculadas a destinos.'
        }
    },
    {
        path: 'catalogos/atracciones/editar/:id',
        component: AtraccionesDetalleComponent
    },
    {
        path: 'solicitudes-cotizacion',
        component: SolicitudesCotizacionComponent,
    },
    {
        path: 'edicion-cotizacion/:id',
        component: CotizacionComponent,
    },
    {
        path: 'destinos',
        component: ConfiguracionDestinosComponent,
    },
    {
        path: 'destinos/configurar-tipos-destinos',
        component: TipoDestinosComponent,
    },
    {
        path: 'destinos/configurar-destinos',
        component: DestinosComponent,
    },
    {
        path: 'destinos/configurar-destinos/editar/:id',
        component: EditarDestinoComponent,
    },
    {
        path: 'destinos/configurar-destinos/preview/:id',
        component: EditarPreviewDestinoComponent,
    },
    {
        path: 'destinos/configurar-destinos/nuevo',
        component: EditarDestinoComponent,
    },

] as Routes;
