import { Routes } from '@angular/router';
import { AdminComponent } from './admin.component';
import { AdminHotelesComponent } from './hoteles/admin-hoteles.component';
import { AdminActividadesComponent } from './actividades/admin-actividades.component';
import { SolicitudesCotizacionComponent } from './solicitudes-cotizacion/solicitudes-cotizacion.component';
import { CotizacionComponent } from './solicitudes-cotizacion/cotizacion/cotizacion.component';

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

] as Routes;
