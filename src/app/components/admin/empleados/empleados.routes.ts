import { Routes } from '@angular/router';
import { EmpleadosComponent } from './empleados.component';

const EMPLEADOS_MANAGE = { permissions: ['empleados.manage'] };

export default [
    {
        path: '',
        component: EmpleadosComponent,
        data: EMPLEADOS_MANAGE,
    },
] as Routes;
