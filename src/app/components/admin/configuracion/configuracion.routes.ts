import { Routes } from '@angular/router';
import { ConfiguracionAdminComponent } from './configuracion.component';
import { IpInformationComponent } from './ip-information/ip-information.component';
import { PermisosAdminComponent } from './permisos/permisos.component';
import { RolesAdminComponent } from './roles/roles.component';

const EMPLEADOS_MANAGE = { permissions: ['empleados.manage'] };

export default [
    {
        path: '',
        component: ConfiguracionAdminComponent,
        data: EMPLEADOS_MANAGE,
    },
    {
        path: 'permisos',
        component: PermisosAdminComponent,
        data: EMPLEADOS_MANAGE,
    },
    {
        path: 'roles',
        component: RolesAdminComponent,
        data: EMPLEADOS_MANAGE,
    },
    {
        path: 'ip-information',
        component: IpInformationComponent,
        data: EMPLEADOS_MANAGE,
    },
] as Routes;
