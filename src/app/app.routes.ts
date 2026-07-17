import { Route } from '@angular/router';
import { AuthGuard } from 'app/core/auth/guards/auth.guard';
import { AccessGuard } from 'app/core/auth/guards/access.guard';
import { NoAuthGuard } from 'app/core/auth/guards/noAuth.guard';
import { LayoutComponent } from 'app/layout/layout.component';
import { ClearSessionGuard } from './core/auth/guards/clear-session.guard';

// @formatter:off
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
export const appRoutes: Route[] = [

    // Redirect empty path to '/example'
    { path: '', pathMatch: 'full', redirectTo: 'inicio' },

    // Redirect signed-in user to the '/example'
    //
    // After the user signs in, the sign-in page will redirect the user to the 'signed-in-redirect'
    // path. Below is another redirection for that path to redirect the user to the desired
    // location. This is a small convenience to keep all main routes together here on this file.
    { path: 'signed-in-redirect', pathMatch: 'full', redirectTo: 'admin/dashboard' },

    // Auth routes for guests
    {
        path: '',
        canActivate: [NoAuthGuard],
        canActivateChild: [NoAuthGuard],
        component: LayoutComponent,
        data: {
            layout: 'empty'
        },
        children: [
            { path: 'confirmation-required', loadChildren: () => import('app/modules/auth/confirmation-required/confirmation-required.routes') },
            { path: 'forgot-password', loadChildren: () => import('app/modules/auth/forgot-password/forgot-password.routes') },
            { path: 'reset-password', loadChildren: () => import('app/modules/auth/reset-password/reset-password.routes') },
            { path: 'sign-in', loadChildren: () => import('app/modules/auth/sign-in/sign-in.routes') },
            { path: 'sign-up', loadChildren: () => import('app/modules/auth/sign-up/sign-up.routes') }
        ]
    },

    // Auth routes for authenticated users
    {
        path: '',
        canActivate: [AuthGuard],
        canActivateChild: [AuthGuard],
        component: LayoutComponent,
        data: {
            layout: 'empty'
        },
        children: [
            { path: 'first-login-password', loadChildren: () => import('app/modules/auth/first-login-password/first-login-password.routes') },
            { path: 'sign-out', loadChildren: () => import('app/modules/auth/sign-out/sign-out.routes') },
            { path: 'unlock-session', loadChildren: () => import('app/modules/auth/unlock-session/unlock-session.routes') }
        ]
    },

    // Landing routes
    {
        path: '',
        component: LayoutComponent,
        data: {
            layout: 'empty'
        },
        children: [
            { path: 'home', loadChildren: () => import('app/modules/landing/home/home.routes') },
            { path: 'preview/firma', loadComponent: () => import('app/shared/banner/banner-preview.component').then(m => m.BannerPreviewComponent) },
        ]
    },

    // Admin routes
    {
        path: '',
        component: LayoutComponent,
        children: [
            {
                path: 'inicio',
                canActivate: [ClearSessionGuard],
                loadChildren: () => import('app/components/inicio/seleccion-destino/seleccion-destino.routes').then(m => m.default)
            },
            {
                path: 'detalle-destino',
                canActivate: [ClearSessionGuard],
                loadChildren: () => import('app/components/inicio/detalle-destino/detalle-destino.routes').then(m => m.default)
            },
            {
                path: 'hoteles',
                canActivate: [ClearSessionGuard],
                loadChildren: () => import('app/components/hoteles/hoteles.routes').then(m => m.default)
            },
            // {
            //     path: 'circuitos',
            //     canActivate: [ClearSessionGuard],
            //     loadChildren: () => import('app/components/circuitos/circuitos.routes').then(m => m.default)
            // },
            {
                path: 'cotizacion',
                canActivate: [ClearSessionGuard],
                 data: { layout: 'empty' },
                loadChildren: () => import('app/components/admin/solicitudes-cotizacion/cotizacion/cotizacion.routes').then(m => m.default)
            },
            {
                path: 'comparativa/:id',
                data: { layout: 'empty' },
                loadComponent: () => import('app/components/comparativa-publica/comparativa-publica.component').then(m => m.ComparativaPublicaComponent)
            },
            {
                path: 'share/comparativa/:id',
                data: { layout: 'empty' },
                loadComponent: () => import('app/components/comparativa-publica/comparativa-publica.component').then(m => m.ComparativaPublicaComponent)
            },
            {
                path: 'admin',
                canActivate: [AuthGuard, AccessGuard],
                data: { layout: 'compact' },
                loadChildren: () =>
                    import('app/components/admin/admin.routes').then(m => m.default)
            }
        ]
    }
];
