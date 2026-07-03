import { Routes } from '@angular/router';
import { AdminHotelesComponent } from './admin-hoteles.component';
import { EditarHotelComponent } from './editar-hotel/editar-hotel.component';

const HOTELES_VIEW = { permissions: ['hoteles.view'] };
const HOTELES_EDIT = { permissions: ['hoteles.edit'] };

export default [
    {
        path: '',
        component: AdminHotelesComponent,
        data: HOTELES_VIEW,
    },
    {
        path: 'editar/:id',
        component: EditarHotelComponent,
        data: HOTELES_EDIT,
    },
] as Routes;
