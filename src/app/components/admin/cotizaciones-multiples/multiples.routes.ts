import { Routes } from '@angular/router';
import { ConcentradoCotizacionesMultiplesComponent } from '../concentrado-cotizaciones-multiples/concentrado-cotizaciones-multiples.component';
import { CotizacionMultipleComponent } from '../cotizacion-multiple/cotizacion-multiple.component';

const COTIZACIONES_VIEW = { permissions: ['cotizaciones.view'] };
const COTIZACIONES_CREATE = { permissions: ['cotizaciones.create'] };

export default [
    {
        path: '',
        component: ConcentradoCotizacionesMultiplesComponent,
        data: COTIZACIONES_VIEW,
    },
    {
        path: 'nueva',
        component: CotizacionMultipleComponent,
        data: COTIZACIONES_CREATE,
    },
] as Routes;
