import {
    HttpErrorResponse,
    HttpEvent,
    HttpHandlerFn,
    HttpRequest,
    HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { FUSE_MOCK_API_DEFAULT_DELAY } from '@fuse/lib/mock-api/mock-api.constants';
import { FuseMockApiService } from '@fuse/lib/mock-api/mock-api.service';
import { Observable, delay, of, switchMap, throwError } from 'rxjs';

export const mockApiInterceptor = (
    request: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
    
    // ✅ Salir inmediatamente si la petición es JSONP
    if (request.method === 'JSONP' || request.url.includes('callback=JSONP_CALLBACK')) {
    console.log('Skipping interceptor for JSONP request', request);
    return next(request); // aquí NO debería tronar si todo es HttpInterceptorFn
}


    const defaultDelay = inject(FUSE_MOCK_API_DEFAULT_DELAY);
    const fuseMockApiService = inject(FuseMockApiService);

    // Buscar handler simulado
    const { handler, urlParams } = fuseMockApiService.findHandler(
        request.method.toUpperCase(),
        request.url
    );

    // ✅ Pasar al siguiente interceptor si no hay handler
    if (!handler) {
        return next(request);
    }

    // Configurar handler
    handler.request = request;
    handler.urlParams = urlParams;

    // Simular respuesta
    return handler.response.pipe(
        delay(handler.delay ?? defaultDelay ?? 0),
        switchMap((response) => {
            if (!response) {
                return throwError(() => new HttpErrorResponse({
                    error: 'NOT FOUND',
                    status: 404,
                    statusText: 'NOT FOUND',
                }));
            }

            const data = {
                status: response[0],
                body: response[1],
            };

            if (data.status >= 200 && data.status < 300) {
                return of(new HttpResponse({
                    body: data.body,
                    status: data.status,
                    statusText: 'OK',
                }));
            }

            return throwError(() => new HttpErrorResponse({
                error: data.body.error,
                status: data.status,
                statusText: 'ERROR',
            }));
        })
    );
};
