import { Routes } from '@angular/router';
import { CondicionesComponent } from './condiciones.component';
import { CondicionesImprimirComponent } from './imprimir/condiciones-imprimir.component';
import { CondicionesPlantillasComponent } from './plantillas/condiciones-plantillas.component';

const CONDICIONES_MANAGE = { permissions: ['condiciones.manage'] };

export default [
    {
        path: '',
        component: CondicionesComponent,
        data: CONDICIONES_MANAGE,
    },
    {
        path: 'plantillas',
        component: CondicionesPlantillasComponent,
        data: CONDICIONES_MANAGE,
    },
    {
        path: 'imprimir',
        component: CondicionesImprimirComponent,
        data: CONDICIONES_MANAGE,
    },
] as Routes;
