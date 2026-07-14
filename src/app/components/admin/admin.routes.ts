import { Routes } from '@angular/router';
import { AdminComponent } from './admin.component';
import { CotizacionesComponent } from './cotizaciones/cotizaciones.component';

export default [
    {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
    },
    {
        path: 'dashboard',
        component: AdminComponent,
    },
    {
        path: 'hoteles',
        loadChildren: () => import('./hoteles/hoteles.routes'),
    },
    {
        path: 'catalogos',
        loadChildren: () => import('./catalogos/catalogos.routes'),
    },
    {
        path: 'actividades',
        redirectTo: 'catalogos',
        pathMatch: 'full',
    },
    {
        path: 'amenidades',
        redirectTo: 'catalogos',
        pathMatch: 'full',
    },
    {
        path: 'solicitudes-cotizacion',
        loadChildren: () => import('./solicitudes-cotizacion/solicitudes.routes'),
    },
    {
        path: 'cotizaciones',
        component: CotizacionesComponent,
    },
    {
        path: 'cotizaciones/solicitudes',
        loadChildren: () => import('./solicitudes-cotizacion/solicitudes.routes'),
    },
    {
        path: 'cotizaciones/concentrado',
        loadChildren: () => import('./cotizaciones-multiples/multiples.routes'),
    },
    {
        path: 'cotizaciones-multiples',
        loadChildren: () => import('./cotizaciones-multiples/multiples.routes'),
    },
    {
        path: 'cotizacion-multiple',
        redirectTo: 'cotizaciones-multiples/nueva',
        pathMatch: 'full',
    },
    {
        path: 'edicion-cotizacion',
        loadChildren: () => import('./solicitudes-cotizacion/cotizacion/cotizacion.routes'),
    },
    {
        path: 'empleados',
        loadChildren: () => import('./empleados/empleados.routes'),
    },
    {
        path: 'condiciones',
        loadChildren: () => import('./condiciones/condiciones.routes'),
    },
    // {
    //     path: 'configuracion',
    //     loadChildren: () => import('./configuracion/configuracion.routes'),
    // },
    {
        path: 'destinos',
        loadChildren: () => import('./destinos/destinos.routes'),
    },
    {
        path: 'circuitos',
        loadChildren: () => import('./circuitos/circuitos.routes'),
    },
] as Routes;
