/* eslint-disable */
import { FuseNavigationItem } from '@fuse/components/navigation';

export const defaultNavigation: FuseNavigationItem[] = [
    {
        id   : 'example',
        title: 'Example',
        type : 'basic',
        icon : 'heroicons_outline:chart-pie',
        link : '/example'
    },
    
];
export const compactNavigation: FuseNavigationItem[] = [
    {
        id   : 'dashboard',
        title: 'Dashboard',
        type : 'basic',
        icon : 'heroicons_outline:chart-pie',
        link : '/admin/dashboard',
        exactMatch: true
    },
    {
        id   : 'destinos',
        title: 'Destinos',
        type : 'basic',
        icon : 'heroicons_outline:map-pin',
        link : '/admin/destinos',
        meta : { permissions: ['destinos.view'] }
    },
    {
        id   : 'hoteles',
        title: 'Hoteles',
        type : 'basic',
        icon : 'heroicons_outline:building-office-2',
        link : '/admin/hoteles',
        meta : { permissions: ['hoteles.view'] }
    },
    // {
    //     id   : 'circuitos',
    //     title: 'Circuitos',
    //     type : 'basic',
    //     icon : 'heroicons_outline:map',
    //     link : '/admin/circuitos',
    //     meta : { permissions: ['circuitos.view'] }
    // },
    {
        id   : 'catalogos',
        title: 'Catalogos',
        type : 'basic',
        icon : 'heroicons_outline:squares-2x2',
        link : '/admin/catalogos',
        meta : { roles: ['admin'] }
    },
    {
        id   : 'cotizaciones',
        title: 'Cotizaciones',
        type : 'basic',
        icon : 'heroicons_outline:inbox-stack',
        link : '/admin/cotizaciones',
        meta : { permissions: ['cotizaciones.view'] }
    },
    // {
    //     id   : 'cotizacion-multiple',
    //     title: 'Cotizaciones multiples',
    //     type : 'basic',
    //     icon : 'heroicons_outline:view-columns',
    //     link : 'admin/cotizaciones-multiples'
    // },
    {
        id   : 'empleados',
        title: 'Empleados',
        type : 'basic',
        icon : 'heroicons_outline:users',
        link : '/admin/empleados',
        meta : { permissions: ['empleados.manage'] }
    },
    // {
    //     id   : 'configuracion',
    //     title: 'Configuracion',
    //     type : 'basic',
    //     icon : 'heroicons_outline:cog-8-tooth',
    //     link : '/admin/configuracion',
    //     meta : { permissions: ['empleados.manage'] }
    // }
];
export const futuristicNavigation: FuseNavigationItem[] = [
    {
        id   : 'example',
        title: 'Example',
        type : 'basic',
        icon : 'heroicons_outline:chart-pie',
        link : '/example'
    }
];
export const horizontalNavigation: FuseNavigationItem[] = [
    {
        id   : 'example',
        title: 'Example',
        type : 'basic',
        icon : 'heroicons_outline:chart-pie',
        link : '/example'
    },
];
