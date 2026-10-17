import { fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { BehaviorSubject, EMPTY } from 'rxjs';
import { DatosService } from 'app/components/hoteles/hoteles.service';
import { DestinosService } from 'app/core/destinos.service';
import { IpQueryService } from 'app/core/services/ip-query.service';
import { TemperatureUnitsService } from 'app/core/services/temperature-units.service';
import { DetalleDestinoComponent } from './detalle-destino.component';

describe('Idioma del detalle del destino', () => {
  let component: DetalleDestinoComponent;
  let idiomas: BehaviorSubject<string>;
  let servicio: jasmine.SpyObj<DestinosService>;

  const detalle = (idioma: string) => [{
    catalogo_destino_id: 10, detalle_id: 20, nombre: 'Acapulco', ubicacion: '',
    detalle: { idioma, nombre: 'Acapulco', apodo: '', descripcion_corta: '', descripcion_larga: idioma, titulo_descripcion: idioma }
  }];

  beforeEach(() => {
    idiomas = new BehaviorSubject('en');
    servicio = jasmine.createSpyObj('DestinosService', ['obtenerDetalleBasicoDestino', 'obtenerDatosRapidosDestino', 'obtenerGaleriaDestino']);
    servicio.obtenerDetalleBasicoDestino.and.callFake(async (_id, idioma) => detalle(idioma));
    servicio.obtenerDatosRapidosDestino.and.resolveTo([]);
    servicio.obtenerGaleriaDestino.and.resolveTo([]);
    TestBed.configureTestingModule({ providers: [
      { provide: ActivatedRoute, useValue: { snapshot: { data: {}, paramMap: new Map([['id', '10']]) } } },
      { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      { provide: TranslocoService, useValue: { langChanges$: idiomas } },
      { provide: DestinosService, useValue: servicio },
      { provide: DatosService, useValue: {} },
      { provide: IpQueryService, useValue: { getCurrentIpInfo: () => EMPTY } },
      { provide: TemperatureUnitsService, useValue: {} }
    ] });
    component = TestBed.runInInjectionContext(() => new DetalleDestinoComponent());
  });

  afterEach(() => component.ngOnDestroy());

  it('usa el idioma activo y permite volver al idioma inicial', fakeAsync(() => {
    component.ngOnInit();
    flushMicrotasks();
    expect(component.detallesDestino.detalle.idioma).toBe('en');
    idiomas.next('de');
    flushMicrotasks();
    idiomas.next('en');
    flushMicrotasks();
    expect(servicio.obtenerDetalleBasicoDestino.calls.allArgs()).toEqual([[10, 'en'], [10, 'de'], [10, 'en']]);
    expect(component.detallesDestino.detalle.idioma).toBe('en');
  }));

  it('no permite que la carga inicial tardía sobrescriba el nuevo idioma', fakeAsync(() => {
    let resolver: (value: ReturnType<typeof detalle>) => void;
    servicio.obtenerDetalleBasicoDestino.and.callFake((_id, idioma) => idioma === 'en'
      ? new Promise(resolve => resolver = resolve)
      : Promise.resolve(detalle(idioma)));
    component.ngOnInit();
    idiomas.next('de');
    flushMicrotasks();
    resolver(detalle('en'));
    flushMicrotasks();
    expect(component.detallesDestino.detalle.idioma).toBe('de');
    expect(servicio.obtenerGaleriaDestino).toHaveBeenCalledOnceWith(20, 'de');
  }));

  it('descarta datos rápidos y galería de un idioma anterior, incluidos sus estados de carga', fakeAsync(() => {
    let resolverDatos: (value: any[]) => void;
    let resolverGaleria: (value: any[]) => void;
    servicio.obtenerDatosRapidosDestino.and.callFake((_id, idioma) => idioma === 'en'
      ? new Promise(resolve => resolverDatos = resolve)
      : new Promise(() => {}));
    servicio.obtenerGaleriaDestino.and.callFake((_id, idioma) => idioma === 'en'
      ? new Promise(resolve => resolverGaleria = resolve)
      : new Promise(() => {}));
    component.ngOnInit();
    flushMicrotasks();
    idiomas.next('de');
    expect(component.detallesDestino).toBeUndefined();
    flushMicrotasks();
    resolverDatos([{ label: 'Old language' }]);
    resolverGaleria([{ id: 1, imagen_fondo: 'old.jpg' }]);
    flushMicrotasks();
    expect(component.detallesDestino.datos_rapidos).toEqual([]);
    expect(component.detallesDestino.atracciones_principales).toEqual([]);
    expect(component.slides).toEqual([]);
    expect(component.cargandoDatosRapidos).toBeTrue();
    expect(component.cargandoGaleria).toBeTrue();
  }));

  it('ignora errores de solicitudes de un idioma anterior', fakeAsync(() => {
    let rechazar: (reason: Error) => void;
    servicio.obtenerDatosRapidosDestino.and.callFake((_id, idioma) => idioma === 'en'
      ? new Promise((_resolve, reject) => rechazar = reject)
      : Promise.resolve([]));
    component.ngOnInit();
    flushMicrotasks();
    idiomas.next('de');
    flushMicrotasks();
    rechazar(new Error('Solicitud anterior'));
    flushMicrotasks();
    expect(component.errorDatosRapidos).toBe('');
    expect(component.cargandoDatosRapidos).toBeFalse();
  }));

  it('no aplica respuestas después de destruir el componente', fakeAsync(() => {
    let resolver: (value: ReturnType<typeof detalle>) => void;
    servicio.obtenerDetalleBasicoDestino.and.returnValue(new Promise(resolve => resolver = resolve));
    component.ngOnInit();
    component.ngOnDestroy();
    resolver(detalle('en'));
    flushMicrotasks();
    expect(component.detallesDestino).toBeUndefined();
    expect(servicio.obtenerGaleriaDestino).not.toHaveBeenCalled();
  }));
});
