import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { TranslocoService } from '@jsverse/transloco';
import { EMPTY } from 'rxjs';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher/public-api';
import { DestinosService } from 'app/core/destinos.service';
import { SupabaseService } from 'app/core/supabase.service';
import { DatosService } from './hoteles.service';
import { HotelesComponent } from './hoteles.component';

describe('HotelesComponent: experiencias y destinos', () => {
    let component: HotelesComponent;
    let destinosService: jasmine.SpyObj<DestinosService>;
    let supabase: jasmine.SpyObj<SupabaseService>;
    const tipos = [
        { id: 1, nombre: 'Playas', slug: 'playas', orden: 1, activo: true },
        { id: 2, nombre: 'Ciudades coloniales', slug: 'ciudades-coloniales', orden: 2, activo: true },
        { id: 3, nombre: 'Cabañas', slug: 'cabanas', orden: 3, activo: true }
    ];
    const destinos = [
        { id: 10, nombre: 'Acapulco', tipo_turistico_id: 1 },
        { id: 20, nombre: 'Puebla', tipo_turistico_id: 2 },
        { id: 30, nombre: 'Mazamitla', tipo_turistico_id: 3 }
    ];

    beforeEach(() => {
        sessionStorage.removeItem('ciudad');
        sessionStorage.removeItem('tipoTuristicoHoteles');
        sessionStorage.setItem('tipoDestino', '1');
        destinosService = jasmine.createSpyObj('DestinosService', [
            'obtenerDestinosCatalogoPublicables', 'obtenerTiposTuristicosCatalogo'
        ]);
        destinosService.obtenerDestinosCatalogoPublicables.and.resolveTo(destinos as any);
        destinosService.obtenerTiposTuristicosCatalogo.and.resolveTo(tipos);
        supabase = jasmine.createSpyObj('SupabaseService', ['listHotelesTarjeta']);
        supabase.listHotelesTarjeta.and.resolveTo([]);
        TestBed.configureTestingModule({
            providers: [
                FormBuilder,
                { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
                { provide: DatosService, useValue: {} },
                { provide: SupabaseService, useValue: supabase },
                { provide: DestinosService, useValue: destinosService },
                { provide: DomSanitizer, useValue: { bypassSecurityTrustHtml: (html: string) => html } },
                { provide: TranslocoService, useValue: { langChanges$: EMPTY } },
                { provide: FuseMediaWatcherService, useValue: { onMediaChange$: EMPTY } }
            ]
        });
        TestBed.overrideComponent(HotelesComponent, {
            set: {
                template: `
                    <div #scrollContainer>
                        <button *ngFor="let tipo of experiencias; trackBy: trackByExperienciaId" type="button"
                            [attr.aria-pressed]="selectedTipoTuristicoId === tipo.id"
                            [disabled]="cargandoDestinos" (click)="seleccionarExperiencia(tipo.id)">
                            {{ tipo.nombre }}
                        </button>
                    </div>
                `
            }
        });
        component = TestBed.runInInjectionContext(() => new HotelesComponent());
    });

    afterEach(() => {
        component.ngOnDestroy();
        sessionStorage.removeItem('ciudad');
        sessionStorage.removeItem('tipoTuristicoHoteles');
        sessionStorage.removeItem('tipoDestino');
    });

    it('pide solo destinos configurados y restaura la categoría del destino guardado', async () => {
        sessionStorage.setItem('ciudad', '20');
        await component.ngOnInit();

        expect(destinosService.obtenerDestinosCatalogoPublicables).toHaveBeenCalledWith('NACIONAL', true);
        expect(component.selectedTipoTuristicoId).toBe(2);
        expect(component.destinosPorExperiencia.map(destino => destino.id)).toEqual([20]);
        expect(component.hotelesForm.get('hotelSeleccionado')?.value).toBe(20);
    });

    it('selecciona el primer destino y carga sus hoteles al cambiar a cabañas sin duplicar la categoría', async () => {
        await component.ngOnInit();
        component.hotelesPorCiudad = [{ id: 99 } as any];
        supabase.listHotelesTarjeta.calls.reset();

        component.seleccionarExperiencia(3);

        expect(component.destinosPorExperiencia.map(destino => destino.id)).toEqual([30]);
        expect(component.opcionesDestinosExperiencia).toEqual([{ value: 30, label: 'Mazamitla' }]);
        expect(component.hotelesForm.get('hotelSeleccionado')?.value).toBe(30);
        expect(component.hotelesPorCiudad).toEqual([]);
        expect(sessionStorage.getItem('ciudad')).toBe('30');
        expect(supabase.listHotelesTarjeta).toHaveBeenCalledWith(30, jasmine.any(String), 0, 10);
        expect(component.experiencias.filter(tipo => tipo.icono === 'cabin').map(tipo => tipo.id)).toEqual([3]);
    });

    it('mantiene vacías las experiencias sin destinos configurados', async () => {
        await component.ngOnInit();
        component.seleccionarExperiencia(-2);

        expect(component.destinosPorExperiencia).toEqual([]);
        expect(component.hotelesForm.get('hotelSeleccionado')?.value).toBeNull();
        expect(component.ciudadSeleccionada).toBeFalse();
        expect(component.hayMasHoteles).toBeFalse();
    });

    it('elige el primero en el orden del desplegable al volver a una experiencia', async () => {
        destinosService.obtenerDestinosCatalogoPublicables.and.resolveTo([
            ...destinos, { id: 11, nombre: 'Cancún', tipo_turistico_id: 1 }
        ] as any);
        await component.ngOnInit();
        component.hotelesForm.get('hotelSeleccionado')?.setValue(11);

        component.seleccionarExperiencia(2);
        component.seleccionarExperiencia(1);

        expect(component.hotelesForm.get('hotelSeleccionado')?.value).toBe(10);
        expect(sessionStorage.getItem('ciudad')).toBe('10');
        expect(supabase.listHotelesTarjeta).toHaveBeenCalledWith(10, jasmine.any(String), 0, 10);
    });

    it('permite salir del estado vacío hacia una experiencia con destinos', async () => {
        await component.ngOnInit();
        component.seleccionarExperiencia(-2);
        component.explorarOtraExperiencia();

        expect(component.selectedTipoTuristicoId).toBe(1);
        expect(component.hotelesForm.get('hotelSeleccionado')?.value).toBe(10);
    });

    it('no ofrece una experiencia alternativa si no hay destinos disponibles', async () => {
        destinosService.obtenerDestinosCatalogoPublicables.and.resolveTo([]);
        await component.ngOnInit();

        expect(component.primeraExperienciaDisponible).toBeNull();
        component.explorarOtraExperiencia();
        expect(component.hotelesForm.get('hotelSeleccionado')?.value).toBeNull();
    });

    it('oculta categorías sin destinos y conserva cabañas y promociones por defecto', async () => {
        destinosService.obtenerDestinosCatalogoPublicables.and.resolveTo([destinos[0]] as any);
        await component.ngOnInit();

        expect(component.experiencias.map(tipo => tipo.id)).toEqual([1, 3, -2]);
        expect(component.experiencias.some(tipo => tipo.id === 2)).toBeFalse();
    });

    it('agrega las dos opciones por defecto cuando no existen en el catálogo', async () => {
        destinosService.obtenerDestinosCatalogoPublicables.and.resolveTo([destinos[0]] as any);
        destinosService.obtenerTiposTuristicosCatalogo.and.resolveTo(tipos.slice(0, 2));
        await component.ngOnInit();

        expect(component.experiencias.map(tipo => tipo.id)).toEqual([1, -1, -2]);
    });

    it('carga hoteles del nuevo destino y conserva el filtro al actualizar el idioma', async () => {
        await component.ngOnInit();
        component.seleccionarExperiencia(3);
        component.hotelesForm.get('hotelSeleccionado')?.setValue(30);
        await component.obtenerDestinos(1, true, 'en');

        expect(component.selectedTipoTuristicoId).toBe(3);
        expect(component.hotelesForm.get('hotelSeleccionado')?.value).toBe(30);
        expect(supabase.listHotelesTarjeta).toHaveBeenCalledWith(30, 'en', 0, 10);
    });

    it('descarta una respuesta pendiente al cambiar de experiencia', async () => {
        await component.ngOnInit();
        let resolver!: (hoteles: any[]) => void;
        supabase.listHotelesTarjeta.and.callFake((id) => id === 10
            ? new Promise(resolve => { resolver = resolve; })
            : Promise.resolve([]));
        component.hotelesForm.get('hotelSeleccionado')?.setValue(10);

        component.seleccionarExperiencia(2);
        resolver([{ id: 99, nombre_hotel: 'Hotel anterior' }]);
        await Promise.resolve();

        expect(component.hotelesPorCiudad).toEqual([]);
        expect(component.hotelesForm.get('hotelSeleccionado')?.value).toBe(20);
        expect(component.cargando).toBeFalse();
    });

    it('permite recuperar las categorías tras un error inicial', async () => {
        destinosService.obtenerDestinosCatalogoPublicables.and.rejectWith(new Error('Sin conexión'));
        await component.ngOnInit();
        expect(component.errorDestinos).toBe('Sin conexión');

        destinosService.obtenerDestinosCatalogoPublicables.and.resolveTo(destinos as any);
        await component.obtenerDestinos(1, true);

        expect(component.errorDestinos).toBe('');
        expect(component.selectedTipoTuristicoId).toBe(1);
        expect(component.destinosPorExperiencia.map(destino => destino.id)).toEqual([10]);
    });

    it('conserva el botón entre pulsar y soltar para poder cambiar de experiencia', async () => {
        const fixture = TestBed.createComponent(HotelesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        const button = fixture.nativeElement.querySelectorAll('button')[1] as HTMLButtonElement;

        button.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelectorAll('button')[1]).toBe(button);
        button.click();
        fixture.detectChanges();
        expect(component.selectedTipoTuristicoId).toBe(2);
        expect(component.hotelesForm.get('hotelSeleccionado')?.value).toBe(20);
        expect(component.opcionesDestinosExperiencia).toEqual([{ value: 20, label: 'Puebla' }]);

        const cabanas = fixture.nativeElement.querySelectorAll('button')[2] as HTMLButtonElement;
        cabanas.click();
        fixture.detectChanges();
        expect(component.selectedTipoTuristicoId).toBe(3);
        expect(component.hotelesForm.get('hotelSeleccionado')?.value).toBe(30);
    });
});
