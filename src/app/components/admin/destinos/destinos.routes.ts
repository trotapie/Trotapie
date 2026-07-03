import { Routes } from '@angular/router';
import { ConfiguracionDestinosComponent } from './configuracion-destinos/configuracion-destinos.component';
import { DestinosComponent } from './destinos/destinos.component';
import { TipoDestinosComponent } from './tipo-destinos/tipo-destinos.component';
import { EditarDestinoComponent } from './editar-destino/editar-destino.component';
import { EditarPreviewDestinoComponent } from './editar-preview-destino/editar-preview-destino.component';
import { EditarActividadDestinoComponent } from './editar-actividad-destino/editar-actividad-destino.component';

const DESTINOS_VIEW = { permissions: ['destinos.view'] };
const DESTINOS_EDIT = { permissions: ['destinos.edit'] };

export default [
    {
        path: '',
        component: ConfiguracionDestinosComponent,
        data: DESTINOS_VIEW,
    },
    {
        path: 'configurar-tipos-destinos',
        component: TipoDestinosComponent,
        data: DESTINOS_EDIT,
    },
    {
        path: 'configurar-destinos',
        component: DestinosComponent,
        data: DESTINOS_VIEW,
    },
    {
        path: 'configurar-destinos/editar/:id',
        component: EditarDestinoComponent,
        data: DESTINOS_EDIT,
    },
    {
        path: 'configurar-destinos/preview/:id',
        component: EditarPreviewDestinoComponent,
        data: DESTINOS_VIEW,
    },
    {
        path: 'configurar-destinos/preview/:id/actividad/:actividadId',
        component: EditarActividadDestinoComponent,
        data: DESTINOS_VIEW,
    },
    {
        path: 'configurar-destinos/nuevo',
        component: EditarDestinoComponent,
        data: DESTINOS_EDIT,
    },
] as Routes;
