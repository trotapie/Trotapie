import { Routes } from '@angular/router';
import { AdminComponent } from './admin.component';
import { AdminHotelesComponent } from './hoteles/admin-hoteles.component';
import { AdminActividadesComponent } from './actividades/admin-actividades.component';
import { SolicitudesCotizacionComponent } from './solicitudes-cotizacion/solicitudes-cotizacion.component';
import { CotizacionComponent } from './solicitudes-cotizacion/cotizacion/cotizacion.component';
import { DestinosComponent } from './destinos/destinos/destinos.component';
import { ConfiguracionDestinosComponent } from './destinos/configuracion-destinos/configuracion-destinos.component';
import { TipoDestinosComponent } from './destinos/tipo-destinos/tipo-destinos.component';

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
        path: 'actividades',
        component: AdminActividadesComponent,
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

] as Routes;
