import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { timeout, catchError, throwError, Observable } from 'rxjs';
import { TimeoutError } from 'rxjs';
import { IpQueryResponse } from '../models/ip-query.model';

@Injectable({
  providedIn: 'root',
})
export class IpQueryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://api.ipquery.io';
  private readonly requestTimeoutMs = 10_000;

  getCurrentIpInfo(): Observable<IpQueryResponse> {
    return this.http
      .get<IpQueryResponse>(`${this.baseUrl}/?format=json`)
      .pipe(timeout({ first: this.requestTimeoutMs }), catchError((error: unknown) => this.handleError(error)));
  }

  getIpInfo(ip: string): Observable<IpQueryResponse> {
    const normalizedIp = ip.trim();

    if (!normalizedIp) {
      return throwError(() => new Error('Escribe una IP valida para realizar la consulta.'));
    }

    const encodedIp = encodeURIComponent(normalizedIp);

    return this.http
      .get<IpQueryResponse>(`${this.baseUrl}/${encodedIp}?format=json`)
      .pipe(timeout({ first: this.requestTimeoutMs }), catchError((error: unknown) => this.handleError(error)));
  }

  private handleError(error: unknown): Observable<never> {
    if (error instanceof TimeoutError) {
      return throwError(() => new Error('La consulta tardó demasiado en responder. Intenta de nuevo.'));
    }

    if (error instanceof HttpErrorResponse) {
      return throwError(() => new Error(this.getFriendlyMessage(error)));
    }

    return throwError(() => new Error('No se pudo consultar la información de la IP.'));
  }

  private getFriendlyMessage(error: HttpErrorResponse): string {
    switch (error.status) {
      case 0:
        return 'No se pudo conectar con ipquery.io. Revisa tu conexión e intenta de nuevo.';
      case 400:
        return 'La IP enviada no es válida. Verifica el formato e intenta otra vez.';
      case 429:
        return 'Se realizaron demasiadas consultas en poco tiempo. Espera un momento e inténtalo otra vez.';
      case 500:
        return 'ipquery.io presentó un problema interno. Intenta nuevamente más tarde.';
      default:
        return 'No se pudo consultar la información de la IP.';
    }
  }
}
