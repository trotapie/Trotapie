import { Routes } from '@angular/router';
import { AdminCircuitosComponent } from './admin-circuitos.component';
import { EditarCircuitoComponent } from './editar-circuito/editar-circuito.component';
import { FlyerEditorComponent } from 'app/shared/flyer-editor/flyer-editor.component';

const CIRCUITOS_VIEW = { permissions: ['circuitos.view'] };
const CIRCUITOS_EDIT = { permissions: ['circuitos.edit'] };

export default [
    {
        path: '',
        component: AdminCircuitosComponent,
        data: CIRCUITOS_VIEW,
    },
    {
        path: 'editar/:id',
        component: EditarCircuitoComponent,
        data: CIRCUITOS_EDIT,
    },
    {
        path: 'flyer/:circuitoId',
        component: FlyerEditorComponent,
        data: CIRCUITOS_EDIT,
    },
] as Routes;
