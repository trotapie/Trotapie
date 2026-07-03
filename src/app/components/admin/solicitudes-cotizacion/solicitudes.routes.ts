import { Routes } from '@angular/router';
import { SolicitudesCotizacionComponent } from './solicitudes-cotizacion.component';
import { CrearCotizacionComponent } from './crear-cotizacion/crear-cotizacion.component';

const COTIZACIONES_VIEW = { permissions: ['cotizaciones.view'] };
const COTIZACIONES_CREATE = { permissions: ['cotizaciones.create'] };

export default [
    {
        path: '',
        component: SolicitudesCotizacionComponent,
        data: COTIZACIONES_VIEW,
    },
    {
        path: 'nueva',
        component: CrearCotizacionComponent,
        data: COTIZACIONES_CREATE,
    },
] as Routes;
