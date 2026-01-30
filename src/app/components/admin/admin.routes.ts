import { Routes } from '@angular/router';
import { AdminComponent } from './admin.component';
import { AdminHotelesComponent } from './hoteles/admin-hoteles.component';
import { AdminActividadesComponent } from './actividades/admin-actividades.component';
import { SolicitudesCotizacionComponent } from './solicitudes-cotizacion/solicitudes-cotizacion.component';

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
        path: '',
        component: AdminComponent,
    },

] as Routes;
