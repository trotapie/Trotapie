import {
    HttpErrorResponse,
    HttpEvent,
    HttpHandlerFn,
    HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';
import { SupabaseService } from 'app/core/supabase.service';
import { Observable, catchError, from, of, switchMap, throwError, timeout } from 'rxjs';

/**
 * Intercept
 *
 * @param req
 * @param next
 */
export const authInterceptor = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
    const authService = inject(AuthService);
    const supabase = inject(SupabaseService);
    const router = inject(Router);

    return from(supabase.getSession()).pipe(
        switchMap(({ data }) => {
            const token = data?.session?.access_token ?? authService.accessToken;

            let newReq = req.clone();
            if (token) {
                newReq = req.clone({
                    headers: req.headers.set('Authorization', 'Bearer ' + token),
                });
            }

            return next(newReq).pipe(
                catchError((error) => {
                    if (error instanceof HttpErrorResponse && error.status === 401) {
                        return authService.signOut().pipe(
                            timeout(3_000),
                            catchError(() => of(true)),
                            switchMap(() => {
                                void router.navigateByUrl('/sign-in');
                                return throwError(() => error);
                            })
                        );
                    }

                    return throwError(() => error);
                })
            );
        })
    );
};
