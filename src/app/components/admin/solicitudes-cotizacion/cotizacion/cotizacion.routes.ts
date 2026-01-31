import { Routes } from '@angular/router';
import { CotizacionComponent } from './cotizacion.component';

export default [
    {
        path: ':id',
        component: CotizacionComponent,
    },
] as Routes;
