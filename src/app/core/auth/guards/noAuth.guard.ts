import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';
import { of, switchMap } from 'rxjs';

export const NoAuthGuard: CanActivateFn | CanActivateChildFn = (
    route,
    state
) => {
    const router: Router = inject(Router);
    const authService = inject(AuthService);

    // Check the authentication status
    return authService
        .check()
        .pipe(
            switchMap((authenticated) => {
                // If the user is authenticated...
                if (authenticated) {
                    return of(
                        router.parseUrl(
                            authService.role === 'admin'
                                ? '/admin/dashboard'
                                : '/admin/solicitudes-cotizacion'
                        )
                    );
                }

                // Allow the access
                return of(true);
            })
        );
};
