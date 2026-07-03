import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { IpQueryService } from './ip-query.service';
import { IpQueryResponse } from '../models/ip-query.model';

describe('IpQueryService', () => {
  let service: IpQueryService;
  let httpMock: HttpTestingController;

  const mockResponse: IpQueryResponse = {
    ip: '8.8.8.8',
    isp: {
      asn: 'AS15169',
      org: 'Google LLC',
      isp: 'Google',
    },
    location: {
      country: 'United States',
      country_code: 'US',
      city: 'Mountain View',
      state: 'California',
      zipcode: '94043',
      latitude: 37.422,
      longitude: -122.084,
      timezone: 'America/Los_Angeles',
      localtime: '2026-07-03 09:45:00',
    },
    risk: {
      is_mobile: false,
      is_vpn: false,
      is_tor: false,
      is_proxy: false,
      is_datacenter: true,
      risk_score: 7,
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(IpQueryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('consulta la IP actual', () => {
    let result: IpQueryResponse | undefined;

    service.getCurrentIpInfo().subscribe((response) => {
      result = response;
    });

    const req = httpMock.expectOne('https://api.ipquery.io/?format=json');
    expect(req.request.method).toBe('GET');

    req.flush(mockResponse);

    expect(result).toEqual(mockResponse);
  });

  it('consulta una IP especifica', () => {
    let result: IpQueryResponse | undefined;

    service.getIpInfo('8.8.8.8').subscribe((response) => {
      result = response;
    });

    const req = httpMock.expectOne('https://api.ipquery.io/8.8.8.8?format=json');
    expect(req.request.method).toBe('GET');

    req.flush(mockResponse);

    expect(result).toEqual(mockResponse);
  });

  it('usa la URL y los parametros correctos para una IP con caracteres especiales', () => {
    service.getIpInfo('2001:db8::1').subscribe();

    const req = httpMock.expectOne('https://api.ipquery.io/2001%3Adb8%3A%3A1?format=json');
    expect(req.request.method).toBe('GET');

    req.flush(mockResponse);
  });

  it('rechaza una IP vacia sin hacer peticion', (done) => {
    service.getIpInfo('   ').subscribe({
      next: () => done.fail('No se esperaba una respuesta exitosa.'),
      error: (error: Error) => {
        expect(error.message).toBe('Escribe una IP valida para realizar la consulta.');
        httpMock.expectNone('https://api.ipquery.io/?format=json');
        done();
      },
    });
  });

  it('traduce el error 400 a un mensaje amigable', (done) => {
    service.getIpInfo('invalid').subscribe({
      next: () => done.fail('No se esperaba una respuesta exitosa.'),
      error: (error: Error) => {
        expect(error.message).toBe('La IP enviada no es válida. Verifica el formato e intenta otra vez.');
        done();
      },
    });

    const req = httpMock.expectOne('https://api.ipquery.io/invalid?format=json');
    req.flush({ message: 'bad request' }, { status: 400, statusText: 'Bad Request' });
  });

  it('traduce el error 429 a un mensaje amigable', (done) => {
    service.getIpInfo('8.8.8.8').subscribe({
      next: () => done.fail('No se esperaba una respuesta exitosa.'),
      error: (error: Error) => {
        expect(error.message).toBe('Se realizaron demasiadas consultas en poco tiempo. Espera un momento e inténtalo otra vez.');
        done();
      },
    });

    const req = httpMock.expectOne('https://api.ipquery.io/8.8.8.8?format=json');
    req.flush({ message: 'too many requests' }, { status: 429, statusText: 'Too Many Requests' });
  });

  it('traduce el error 500 a un mensaje amigable', (done) => {
    service.getIpInfo('8.8.8.8').subscribe({
      next: () => done.fail('No se esperaba una respuesta exitosa.'),
      error: (error: Error) => {
        expect(error.message).toBe('ipquery.io presentó un problema interno. Intenta nuevamente más tarde.');
        done();
      },
    });

    const req = httpMock.expectOne('https://api.ipquery.io/8.8.8.8?format=json');
    req.flush({ message: 'server error' }, { status: 500, statusText: 'Internal Server Error' });
  });

  it('traduce un error de red a un mensaje amigable', (done) => {
    service.getCurrentIpInfo().subscribe({
      next: () => done.fail('No se esperaba una respuesta exitosa.'),
      error: (error: Error) => {
        expect(error.message).toBe('No se pudo conectar con ipquery.io. Revisa tu conexión e intenta de nuevo.');
        done();
      },
    });

    const req = httpMock.expectOne('https://api.ipquery.io/?format=json');
    req.error(new ProgressEvent('error'));
  });
});
