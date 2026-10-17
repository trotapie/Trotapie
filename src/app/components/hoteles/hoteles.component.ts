import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, ViewChild, ViewEncapsulation } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, FormsModule } from '@angular/forms';
import { Destinos, GrupoDestino, Hotel, HotelConDestino, IHoteles } from './hoteles.interface';
import { MaterialModule } from 'app/shared/material.module';
import { Router } from '@angular/router';
import { distinctUntilChanged, filter, Observable, startWith, Subject, takeUntil } from 'rxjs';
import { DatosService } from './hoteles.service';
import { FloatingSearchComponent } from './search-component/floating-search.component';
import { SupabaseService } from 'app/core/supabase.service';
import { DomSanitizer } from '@angular/platform-browser';
import { MatSelect, MatSelectChange } from '@angular/material/select';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { FooterComponent } from 'app/footer/footer.component';
import { getDefaultLang } from 'app/lang.utils';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher/public-api';
import { DestinosService, TipoTuristicoCatalogo } from 'app/core/destinos.service';
import { TpSelectSearchComponent, TpSelectSearchOption } from 'app/shared/tp-select-search/tp-select-search.component';

type DestinoExperiencia = Destinos & { tipo_turistico_id: number | null };

@Component({
    selector: 'hoteles',
    templateUrl: './hoteles.component.html',
    styleUrl: './hoteles.component.scss',
    imports: [MaterialModule, FormsModule,
        TranslocoModule, FooterComponent, TpSelectSearchComponent],
    encapsulation: ViewEncapsulation.None,
    standalone: true
})

export class HotelesComponent {
    private formBuilder = inject(FormBuilder);
    private router = inject(Router);
    private datosService = inject(DatosService);
    private supabase = inject(SupabaseService);
    private destinosService = inject(DestinosService);
    private sanitizer = inject(DomSanitizer)
    private _translocoService = inject(TranslocoService);
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private _fuseMediaWatcherService = inject(FuseMediaWatcherService)
    private destroyRef = inject(DestroyRef);
    
    /**
     * Constructor
     */

    hotelesForm: FormGroup;
    listaHoteles: any[];
    listaHotelesFiltrada: IHoteles[] = [];
    hotelesPorCiudad: Hotel[] = [];
    ciudadSeleccionada: boolean;
    cargando = false;
    cargandoMasHoteles = false;
    hayMasHoteles = true;
    private readonly hotelesPorPagina = 10;
    private siguienteHotelOffset = 0;
    private hotelesObserver?: IntersectionObserver;
    private hotelesRequestId = 0;
    private destinosRequestId = 0;
    hotel: Hotel;
    rating: Number;
    descuentoEstilos = ['descuento-rect', 'descuento-estrella', 'descuento-circulo'];
    // @ViewChild('scrollContainer') scrollContainer!: ElementRef;
    @ViewChild('internacionalesSentinela') internacionalesSentinela!: ElementRef;
    @ViewChild('sentinelaInternacionales') sentinelaInternacionales!: ElementRef;
    internacionalesEnVista = false;
    tabIndexSeleccionado = 0;
    tabOffsets: number[] = [];
    tabWidths: number[] = [];
    error = '';
    @ViewChild('scrollContainer', { static: true }) scrollContainer!: ElementRef<HTMLElement>;
    @ViewChild('ancla', { static: false }) ancla!: ElementRef<HTMLElement>;
    @ViewChild('anclaNacionales', { static: false }) anclaNacionales!: ElementRef<HTMLElement>;
    @ViewChild('hotelesSentinel')
    set hotelesSentinel(element: ElementRef<HTMLElement> | undefined) {
        this.hotelesObserver?.disconnect();
        if (!element) return;

        this.hotelesObserver = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) void this.cargarMasHoteles();
            },
            { root: this.scrollContainer?.nativeElement ?? null, rootMargin: '300px 0px' }
        );
        this.hotelesObserver.observe(element.nativeElement);
    }
    mostrarInfo: boolean = false;
    destinos: Destinos[] = [];
    destinosNacionales: Destinos[] = [];
    destinosPorExperiencia: Destinos[] = [];
    tiposTuristicos: TipoTuristicoCatalogo[] = [];
    selectedTipoTuristicoId: number | null = null;
    cargandoDestinos = false;
    errorDestinos = '';
    tipoDestino: number = 1;
    gruposDestinos: GrupoDestino[] = [];

    imagenesFondo: string[] = [];

    currentIndex = 0;
    currentImage = this.imagenesFondo[Math.floor(Math.random() * this.imagenesFondo.length)];
    overlayImage: string | null = null;
    isTransitioning = false;

    previousIndex = -1;
    intervalId: any;

    continentes: any[] = [];
    destinoSelected: Destinos;
    openDropdown = false;
    agrupadosDestinos: { nombrePadre: string; destinos: any[] }[] = [];
    destinoCtrl = new FormControl<string>('');
    filteredAgrupadosDestinos: { nombrePadre: string; destinos: any[] }[] = [];
    destinoId: number;
    selectedDestinoLabel: string | null = null;
    modoDestino: 'padres' | 'hijos' = 'padres';
    grupoSeleccionado: any | null = null;
    destinoFiltroCtrl = new FormControl(''); // solo para el texto del autocomplete
    @ViewChild('selectDestino') selectDestinoInternacionales!: MatSelect;
    // overlayAnimatedOnce = false;
    // @ViewChild('heroCard', { static: false })
    // heroCard!: FuseCardComponent;


    avisoUrl = '';

    filtroDestino: string = '';
    verTodos = false;
    panelActivo = '';
    isScreenSmall: boolean;

    constructor() {
    }

    async ngOnInit() {
        if (sessionStorage.getItem('tipoDestino') === null) {
            this.router.navigate(['/inicio']);
        } else {
            this.hotelesForm = this.formBuilder.group({
                hotelSeleccionado: ['']
            });
            this.hotelesForm.get('hotelSeleccionado')?.valueChanges.pipe(
                takeUntilDestroyed(this.destroyRef)
            ).subscribe(valor => {
                void this.cargarHotelesIniciales();
                if (valor) {
                    sessionStorage.setItem('ciudad', valor.toString());
                } else {
                    sessionStorage.removeItem('ciudad');
                }
            });
            await this.obtenerDestinos();
            const idiomaInicial = getDefaultLang();
            this._translocoService.langChanges$.pipe(
                distinctUntilChanged(),
                filter((activeLang) => activeLang !== idiomaInicial),
                takeUntilDestroyed(this.destroyRef)
            ).subscribe((activeLang) => {
                void this.obtenerDestinos(this.tipoDestino, true, activeLang);
            });
        }
        this._fuseMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({ matchingAliases }) => {
                this.isScreenSmall = !matchingAliases.includes('md');
            });
    }

    ngAfterViewInit(): void {
        const observer = new IntersectionObserver(
            ([entry]) => {
                this.internacionalesEnVista = entry.intersectionRatio > 0;
            },
            {
                root: null,
                threshold: 1.0
            }
        );

        if (this.sentinelaInternacionales?.nativeElement) {
            observer.observe(this.sentinelaInternacionales.nativeElement);
        }
        const savedScroll = sessionStorage.getItem('scrollTopHoteles');
        if (savedScroll) {
            setTimeout(() => {
                this.scrollContainer.nativeElement.scrollTop = +savedScroll;
                sessionStorage.removeItem('scrollTopHoteles');
                this.updateTabPosition();
            }, 500);
        }


    }

    ngOnDestroy(): void {
        this.hotelesRequestId++;
        this.destinosRequestId++;
        if (this.intervalId) clearInterval(this.intervalId);
        this.hotelesObserver?.disconnect();
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    get selectedDestinoNombre(): string | null {
        const id = this.hotelesForm.get('hotelSeleccionado')?.value;
        const found = this.destinos?.find(d => d.id === id);
        return found ? found.nombre : null;
    }

    selectDestino(destino: any): void {
        this.hotelesForm.get('hotelSeleccionado')?.setValue(destino.id);
        this.openDropdown = false;
        this.selectedDestinoLabel = destino.nombre;

    }

    async obtenerDestinos(tipoDestino?: number, conservarSeleccion = false, idioma = getDefaultLang()) {
        const requestId = ++this.destinosRequestId;
        this.tipoDestino = tipoDestino ?? (sessionStorage.getItem('tipoDestino') !== null
            ? +sessionStorage.getItem('tipoDestino')
            : this.tipoDestino);

        this.cargandoDestinos = true;
        this.errorDestinos = '';
        try {
            if (this.tipoDestino === 1) {
                const [destinos, tipos] = await Promise.all([
                    this.destinosService.obtenerDestinosCatalogoPublicables('NACIONAL', true),
                    this.destinosService.obtenerTiposTuristicosCatalogo(false, idioma)
                ]);
                if (requestId !== this.destinosRequestId) return;
                this.destinos = destinos as DestinoExperiencia[];
                this.tiposTuristicos = tipos;
                const ciudadId = Number(this.hotelesForm.get('hotelSeleccionado')?.value || sessionStorage.getItem('ciudad'));
                const destinoActual = destinos.find(destino => destino.id === ciudadId);
                const tipoActual = destinoActual?.tipo_turistico_id;
                if (!conservarSeleccion || !this.experiencias.some(tipo => tipo.id === this.selectedTipoTuristicoId)) {
                    const tipoGuardado = Number(sessionStorage.getItem('tipoTuristicoHoteles'));
                    this.selectedTipoTuristicoId = tipos.some(tipo => tipo.id === tipoActual)
                        ? tipoActual
                        : this.experiencias.some(tipo => tipo.id === tipoGuardado)
                            ? tipoGuardado
                            : this.experiencias[0]?.id ?? null;
                }
                this.filtrarDestinosPorExperiencia();
            } else {
                const { data, error } = await this.supabase.obtenerDestinos(this.tipoDestino);
                if (requestId !== this.destinosRequestId) return;
                if (error) throw error;
                this.destinos = data;
            }
        } catch (error: any) {
            if (requestId !== this.destinosRequestId) return;
            this.errorDestinos = error?.message ?? 'No se pudieron cargar los destinos.';
            return;
        } finally {
            if (requestId === this.destinosRequestId) this.cargandoDestinos = false;
        }

        const ciudadGuardada = Number(this.hotelesForm.get('hotelSeleccionado')?.value || sessionStorage.getItem('ciudad'));
        const opciones = this.tipoDestino === 1 ? this.destinosPorExperiencia : this.destinos;
        const destinoSeleccionado = opciones.find(destino => destino.id === ciudadGuardada)
            ?? (conservarSeleccion ? undefined : opciones[0]);

        this.hotelesForm.patchValue({ hotelSeleccionado: destinoSeleccionado?.id ?? null }, { emitEvent: false });
        if (destinoSeleccionado) sessionStorage.setItem('ciudad', String(destinoSeleccionado.id));
        else sessionStorage.removeItem('ciudad');

        await this.cargarHotelesIniciales(idioma);
    }

    get opcionesDestinosExperiencia(): TpSelectSearchOption[] {
        return this.destinosPorExperiencia.map(destino => ({ value: destino.id, label: destino.nombre }));
    }

    trackByExperienciaId(_: number, tipo: { id: number }): number {
        return tipo.id;
    }

    get experiencias(): Array<{ id: number; nombre: string; icono: string }> {
        const tiposConDestinos = new Set((this.destinos as DestinoExperiencia[]).map(destino => destino.tipo_turistico_id));
        const tipos = this.tiposTuristicos
            .filter(tipo => tiposConDestinos.has(tipo.id) || ['cabin', 'local_offer'].includes(this.iconoExperiencia(tipo.slug)))
            .map(tipo => ({ ...tipo, icono: this.iconoExperiencia(tipo.slug) }));
        if (!this.tiposTuristicos.some(tipo => this.iconoExperiencia(tipo.slug) === 'cabin')) {
            tipos.push({ id: -1, nombre: '', slug: '', orden: 0, activo: true, icono: 'cabin' });
        }
        if (!this.tiposTuristicos.some(tipo => this.iconoExperiencia(tipo.slug) === 'local_offer')) {
            tipos.push({ id: -2, nombre: '', slug: '', orden: 0, activo: true, icono: 'local_offer' });
        }
        return tipos;
    }

    private iconoExperiencia(slug: string): string {
        if (/caban|cabin/.test(slug)) return 'cabin';
        if (/promoc|oferta/.test(slug)) return 'local_offer';
        if (/playa/.test(slug)) return 'beach_access';
        return 'location_city';
    }

    private filtrarDestinosPorExperiencia(): void {
        this.destinosPorExperiencia = (this.destinos as DestinoExperiencia[])
            .filter(destino => destino.tipo_turistico_id === this.selectedTipoTuristicoId && this.selectedTipoTuristicoId !== null);
    }

    seleccionarExperiencia(tipoId: number): void {
        if (this.selectedTipoTuristicoId === tipoId || this.cargandoDestinos) return;
        this.selectedTipoTuristicoId = tipoId;
        sessionStorage.setItem('tipoTuristicoHoteles', String(tipoId));
        this.filtrarDestinosPorExperiencia();
        const control = this.hotelesForm.get('hotelSeleccionado');
        control?.setValue(this.destinosPorExperiencia[0]?.id ?? null);
    }

    get primeraExperienciaDisponible(): number | null {
        const tiposConDestinos = new Set((this.destinos as DestinoExperiencia[]).map(destino => destino.tipo_turistico_id));
        return this.experiencias.find(tipo => tiposConDestinos.has(tipo.id))?.id ?? null;
    }

    explorarOtraExperiencia(): void {
        const tipoId = this.primeraExperienciaDisponible;
        if (tipoId !== null) this.seleccionarExperiencia(tipoId);
    }

    private async cargarHotelesIniciales(idioma = getDefaultLang()): Promise<void> {
        const requestId = ++this.hotelesRequestId;
        const hotelId = Number(this.hotelesForm.get('hotelSeleccionado')?.value);
        this.hotelesObserver?.disconnect();
        this.cargando = true;
        this.cargandoMasHoteles = false;
        this.hayMasHoteles = false;
        this.siguienteHotelOffset = 0;
        this.hotelesPorCiudad = [];
        this.listaHoteles = [];
        this.gruposDestinos = [];
        this.ciudadSeleccionada = !!hotelId;
        this.error = '';

        try {
            if (!hotelId) return;

            if (this.tipoDestino === 2) {
                const hoteles = await this.supabase.listHotelesAllPorDestinoPadre(hotelId, idioma);
                if (requestId !== this.hotelesRequestId) return;
                const hotelesPreparados = this.prepararHoteles(hoteles ?? []);
                this.gruposDestinos = this.agruparHotelesPorDestino(hotelesPreparados);
                this.listaHoteles = hotelesPreparados;
                this.hayMasHoteles = false;
                this.destinoSeleccionado(hotelesPreparados);
                this.mostrarInfo = true;
                return;
            }

            if (this.tipoDestino !== 1) return;

            this.destinoSelected = this.destinos.find(item => item.id === hotelId);
            const hoteles = await this.supabase.listHotelesTarjeta(hotelId, idioma, 0, this.hotelesPorPagina);
            if (requestId !== this.hotelesRequestId) return;
            this.hotelesPorCiudad = this.prepararHoteles(hoteles);
            this.listaHoteles = this.hotelesPorCiudad;
            this.siguienteHotelOffset = this.hotelesPorCiudad.length;
            this.hayMasHoteles = hoteles.length === this.hotelesPorPagina;
            this.destinoSeleccionado(this.hotelesPorCiudad);
            this.mostrarInfo = true;
        } catch (error: any) {
            if (requestId !== this.hotelesRequestId) return;
            this.error = error?.message ?? 'No se pudieron cargar los hoteles.';
        } finally {
            if (requestId === this.hotelesRequestId) this.cargando = false;
        }
    }

    private async cargarMasHoteles(): Promise<void> {
        const hotelId = Number(this.hotelesForm.get('hotelSeleccionado')?.value);
        if (this.cargando || this.cargandoMasHoteles || !this.hayMasHoteles || !hotelId || this.tipoDestino !== 1) return;

        this.cargandoMasHoteles = true;
        this.error = '';
        const requestId = this.hotelesRequestId;
        try {
            const hoteles = await this.supabase.listHotelesTarjeta(
                hotelId,
                getDefaultLang(),
                this.siguienteHotelOffset,
                this.hotelesPorPagina
            );
            if (requestId !== this.hotelesRequestId) return;
            const nuevosHoteles = this.prepararHoteles(hoteles);
            this.hotelesPorCiudad = [...this.hotelesPorCiudad, ...nuevosHoteles];
            this.listaHoteles = this.hotelesPorCiudad;
            this.siguienteHotelOffset += nuevosHoteles.length;
            this.hayMasHoteles = nuevosHoteles.length === this.hotelesPorPagina;
        } catch (error: any) {
            if (requestId !== this.hotelesRequestId) return;
            this.error = error?.message ?? 'No se pudieron cargar más hoteles.';
        } finally {
            if (requestId === this.hotelesRequestId) this.cargandoMasHoteles = false;
        }
    }

    reintentarHoteles(): void {
        if (this.hotelesPorCiudad.length) void this.cargarMasHoteles();
        else void this.cargarHotelesIniciales();
    }

    private prepararHoteles(hoteles: any[]): any[] {
        return hoteles.map((hotel) => ({
            ...hotel,
            conceptoIconoSeguro: hotel.concepto?.icono
                ? this.sanitizer.bypassSecurityTrustHtml(hotel.concepto.icono)
                : null,
            descuentoSeguro: hotel.descuento?.icono
                ? this.sanitizer.bypassSecurityTrustHtml(hotel.descuento.icono)
                : null
        }));
    }

    destinoSeleccionado(event) {
        this.ciudadSeleccionada = true;
        if (event !== undefined) {
            this.hotelesPorCiudad = event === undefined ? [] : event;
        } else {
            this.hotelesPorCiudad = []
        }

    }

    verDetalleHotel(hotel: any): void {
        const slug = hotel.nombre_hotel
            .trim()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9& ]+/g, "")
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');

        const scrollTop = this.scrollContainer.nativeElement.scrollTop;
        sessionStorage.setItem('scrollTopHoteles', scrollTop.toString());
        sessionStorage.setItem('hotel', JSON.stringify(hotel))
        this.router.navigate(['/hoteles/detalle-hotel', hotel.id, slug], {
            state: { hotel }
        });
    }

    getFullStars(rating: number): any[] {
        rating = rating === undefined ? 0 : rating;

        return Array(Math.floor(rating));
    }

    hasHalfStar(rating: number): boolean {
        const decimal = rating % 1;
        return decimal >= 0.25 && decimal < 0.75;
    }

    getEmptyStars(rating: number): any[] {
        rating = rating === undefined ? 0 : rating;

        const full = Math.floor(rating);
        const half = this.hasHalfStar(rating) ? 1 : 0;
        return Array(5 - full - half);
    }

    getDiamantes(diamantes: number): any[] {
        return Array(diamantes);
    }

    getEmptyDiamantes(diamantes: number): any[] {
        return Array(5 - diamantes);
    }

    getDescuentoClass(hotel: any): string {
        if (!hotel._descuentoClase) {
            const randomIndex = Math.floor(Math.random() * this.descuentoEstilos.length);
            hotel._descuentoClase = this.descuentoEstilos[randomIndex];
        }
        return hotel._descuentoClase;
    }

    seleccionarCiudad(item: any) {
        this.ciudadSeleccionada = item.ciudad;
        this.destinoSeleccionado(item);
    }

    seleccionarTab(item: any, index: number, tabElement: HTMLElement) {
        this.tabIndexSeleccionado = index;
        this.destinoSeleccionado(item);
        this.updateTabPosition();
    }

    updateTabPosition() {
        setTimeout(() => {
            const tabs = document.querySelectorAll('button');
            this.tabOffsets = Array.from(tabs).map(tab => (tab as HTMLElement).offsetLeft);
            this.tabWidths = Array.from(tabs).map(tab => (tab as HTMLElement).offsetWidth);
        });
    }

    onHotelesFiltrados(dataFiltrada: IHoteles[]) {
        this.listaHotelesFiltrada = dataFiltrada;
        let ciudad = sessionStorage.getItem('ciudad');
        ciudad = ciudad === null ? 'Mazatlán' : ciudad;
    }

    irA(): void {
        this.tipoDestino = 2;
        const container = this.scrollContainer?.nativeElement;
        const target = this.anclaNacionales?.nativeElement;
        if (!container || !target) return;

        const targetY = this.getOffsetWithinContainer(target, container);
        const offset = this.getStickyOffset(container);

        container.scrollTo({
            top: Math.max(0, targetY - offset),
            behavior: 'smooth'
        });
        this.actualizacionDestinos();
    }

    irANacionales(): void {
        this.tipoDestino = 1;

        const container = this.scrollContainer?.nativeElement;
        const target = this.anclaNacionales?.nativeElement;
        if (!container || !target) return;

        const targetY = this.getOffsetWithinContainer(target, container);
        const offset = this.getStickyOffset(container);

        container.scrollTo({
            top: Math.max(0, targetY - offset),
            behavior: 'smooth'
        });
        this.actualizacionDestinos();

    }

    async actualizacionDestinos() {
        await this.obtenerDestinos(this.tipoDestino);
    }

    agruparHotelesPorDestino(hoteles: any[]): GrupoDestino[] {
        const mapa = new Map<
            string,
            { hoteles: HotelConDestino[]; imagen: string | null }
        >();

        hoteles.forEach(hotel => {
            const ciudad = hotel.destinos?.nombre ?? 'Sin destino';
            const pais = hotel.destinos?.destino_padre?.nombre ?? '';
            const key = pais ? `${ciudad}, ${pais}` : ciudad;

            const imagen = hotel.destinos?.imagen_destino ?? null;

            if (!mapa.has(key)) {
                mapa.set(key, {
                    hoteles: [],
                    imagen
                });
            }

            // Si el grupo no tenía imagen y este hotel sí trae, la asignamos
            const grupo = mapa.get(key)!;
            if (!grupo.imagen && imagen) {
                grupo.imagen = imagen;
            }

            grupo.hoteles.push(hotel);
        });

        return Array.from(mapa.entries()).map(([destino, data]) => ({
            destino,
            imagen: data.imagen,
            hoteles: data.hoteles
        }));
    }

    cargaInfo(item) {
        this.destinoId = this.tipoDestino === 1 ? +item.id : +item.destinos[0].id
        sessionStorage.setItem('ciudad', this.destinoId.toString())

        this.obtenerDestinos(this.tipoDestino);
    }


    onDestinoChange(event: MatSelectChange): void {
        if (this.modoDestino === 'padres') {
            const nombrePadre = event.value as string;

            this.grupoSeleccionado = this.agrupadosDestinos.find(
                g => g.nombrePadre === nombrePadre
            ) ?? null;

            this.modoDestino = 'hijos';
            this.hotelesForm.get('hotelSeleccionado')?.setValue(null, { emitEvent: false });

            setTimeout(() => this.selectDestinoInternacionales.open());
        } else {
            const destino = this.grupoSeleccionado?.destinos.find(d => d.id === event.value);
            this.selectedDestinoLabel = destino ? destino.nombre : null;

            this.hotelesForm.get('hotelSeleccionado')?.setValue(event.value);
        }
    }

    volverAPadres(): void {
        this.modoDestino = 'padres';
        this.grupoSeleccionado = null;
        this.selectedDestinoLabel = null;
        this.hotelesForm.get('hotelSeleccionado')?.setValue(null, { emitEvent: false });

        setTimeout(() => this.selectDestinoInternacionales.open());
    }

    onDestinoSelected(destino: any): void {
        this.hotelesForm.get('hotelSeleccionado')?.setValue(destino.id);
        this.destinoFiltroCtrl.setValue(destino.nombre, { emitEvent: false });
    }

    get destinosFiltrados() {
        if (!this.filtroDestino.trim()) return this.agrupadosDestinos;
        const term = this.filtroDestino.toLowerCase();

        return this.agrupadosDestinos
            .map(g => ({
                nombrePadre: g.nombrePadre,
                destinos: g.destinos.filter(d => d.nombre.toLowerCase().includes(term))
            }))
            .filter(g => g.destinos.length > 0);
    }

    displayDestino(destino: any): string {
        return destino ? destino.nombre : '';
    }


    private getOffsetWithinContainer(target: HTMLElement, container: HTMLElement): number {
        let y = 0;
        let node: HTMLElement | null = target;
        while (node && node !== container) {
            y += node.offsetTop;
            node = node.offsetParent as HTMLElement | null;
        }
        return y;
    }

    private getStickyOffset(container: HTMLElement): number {
        let offset = 0;
        const stickies = container.querySelectorAll<HTMLElement>('.sticky.top-0');
        stickies.forEach(el => offset = Math.max(offset, el.offsetHeight || 0));
        return offset + 8;
    }

    private gruposExpandidos = new Set<number | string>();

    private keyGrupo(grupo: any): number | string {
        return grupo?.destino_id ?? grupo?.id ?? grupo?.destino;
    }

    estaExpandido(grupo: any): boolean {
        return this.gruposExpandidos.has(this.keyGrupo(grupo));
    }

    toggleGrupo(grupo: any, anchor?: HTMLElement): void {
        const key = this.keyGrupo(grupo);
        const estabaExpandido = this.gruposExpandidos.has(key);

        // Guardamos la posición del botón ANTES del cambio
        const topAntes = anchor?.getBoundingClientRect().top ?? 0;

        // Toggle normal
        if (estabaExpandido) this.gruposExpandidos.delete(key);
        else this.gruposExpandidos.add(key);

        // Solo al CERRAR (colapsar) compensamos el salto
        if (estabaExpandido && anchor) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const topDespues = anchor.getBoundingClientRect().top;
                    const delta = topDespues - topAntes;

                    // Si el colapso te "bajó", delta suele ser positivo -> subimos compensando
                    window.scrollTo({
                        top: window.scrollY + delta,
                        behavior: 'smooth',
                    });
                });
            });
        }
    }


    hotelesMostrados(grupo: any) {
        
        const hoteles = grupo?.hoteles ?? [];
        return this.estaExpandido(grupo) ? hoteles : this.isScreenSmall ? hoteles.slice(0, 2) : hoteles.slice(0, 3);
    }

    trackByGrupo = (_: number, g: any) => g?.destino_id ?? g?.id ?? g?.destino ?? _;
    trackByHotelId = (_: number, h: any) => h?.hotel_id ?? h?.id ?? _;

    abrirAutocomplete(input: HTMLInputElement) {
        input.focus();
        input.click();
    }
}
