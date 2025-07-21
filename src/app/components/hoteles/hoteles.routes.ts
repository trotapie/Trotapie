import { Routes } from '@angular/router';
import { HotelesComponent } from './hoteles.component';
import { DetalleHotelComponent } from './detalles-hotel/detalle-hotel.component';

export default [
    {
        path: '',
        component: HotelesComponent,
    },
    {
        path: 'detalle-hotel/:id',
        component: DetalleHotelComponent,
    }
] as Routes;
