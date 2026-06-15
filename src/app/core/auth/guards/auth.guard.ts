import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';
import { of, switchMap } from 'rxjs';

export const AuthGuard: CanActivateFn | CanActivateChildFn = (route, state) => {
    const router: Router = inject(Router);
    const authService = inject(AuthService);

    // Check the authentication status
    return authService
        .check()
        .pipe(
            switchMap((authenticated) => {
                // If the user is not authenticated...
                if (!authenticated) {
                    // Redirect to the sign-in page with a redirectUrl param
                    const redirectURL =
                        state.url === '/sign-out'
                            ? ''
                            : `redirectURL=${state.url}`;
                    const urlTree = router.parseUrl(`sign-in?${redirectURL}`);

                    return of(urlTree);
                }

                if (
                    authService.requiresPasswordChange &&
                    state.url !== '/first-login-password' &&
                    state.url !== '/sign-out'
                ) {
                    return of(router.parseUrl('/first-login-password'));
                }

                // Allow the access
                return of(true);
            })
        );
};
