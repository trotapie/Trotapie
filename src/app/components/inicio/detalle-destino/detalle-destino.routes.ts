import { Routes } from '@angular/router';
import { DetalleDestinoComponent } from './detalle-destino.component';

export default [
    {
        path: ':id',
        component: DetalleDestinoComponent,
    }
] as Routes;
