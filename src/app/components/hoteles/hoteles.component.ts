import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, inject, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule } from '@angular/forms';
import { Destinos, GrupoDestino, Hotel, HotelConDestino, IHoteles } from './hoteles.interface';
import { MaterialModule } from 'app/shared/material.module';
import { JsonpClientBackend, HttpClientJsonpModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { stringify } from 'crypto-js/enc-base64';
import { Observable, startWith } from 'rxjs';
import { DatosService } from './hoteles.service';
import { FuseSplashScreenService } from '@fuse/services/splash-screen';
import { TextTypewriterComponent } from 'app/text-typewriter.component';
import { FloatingSearchComponent } from './search-component/floating-search.component';
import { SupabaseService } from 'app/core/supabase.service';
import { DomSanitizer } from '@angular/platform-browser';
import { MatSelect, MatSelectChange } from '@angular/material/select';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { FooterComponent } from 'app/footer/footer.component';
import { getDefaultLang } from 'app/lang.utils';
import { FuseCardComponent } from '@fuse/components/card';

@Component({
    selector: 'hoteles',
    templateUrl: './hoteles.component.html',
    imports: [MaterialModule, FormsModule, FloatingSearchComponent, TranslocoModule, FooterComponent],
    encapsulation: ViewEncapsulation.None,
    standalone: true
})

export class HotelesComponent {
    private formBuilder = inject(FormBuilder);
    private router = inject(Router);
    private datosService = inject(DatosService);
    private splashScreen = inject(FuseSplashScreenService)
    private supabase = inject(SupabaseService);
    private sanitizer = inject(DomSanitizer)
    private _translocoService = inject(TranslocoService);

    /**
     * Constructor
     */

    hotelesForm: FormGroup;
    listaHoteles: any[];
    listaHotelesFiltrada: IHoteles[] = [];
    hotelesPorCiudad: Hotel[] = [];
    ciudadSeleccionada: boolean;
    cargando = false;
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
    mostrarInfo: boolean = false;
    destinos: Destinos[] = [];
    destinosNacionales: Destinos[] = [];
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
    overlayAnimatedOnce = false;
    @ViewChild('heroCard', { static: false })
    heroCard!: FuseCardComponent;


    avisoUrl = '';

    filtroDestino: string = '';
    constructor() {
    }

    async ngOnInit() {
        this.obtenerSoloDestinos();

        this.hotelesForm = this.formBuilder.group({
            hotelSeleccionado: ['']
        });
        if (sessionStorage.getItem('tipoDestino') !== null) {
            this.obtenerDestinos()
            this.splashScreen.show();
        }

        this.obtenerImagenesFondo();

        this._translocoService.langChanges$.subscribe(async (activeLang) => {
            const hotelId = +this.hotelesForm.get('hotelSeleccionado')?.value
            this.destinoSelected = this.destinos.find(item => item.id === +hotelId);
            const busqueda = this.tipoDestino === 1 ? this.supabase.listHotelesAll(hotelId, activeLang) : this.supabase.listHotelesAllPorDestinoPadre(hotelId, activeLang);
            const data = await busqueda;
            const info = (data ?? []).map((hotel: any) => ({
                ...hotel,
                conceptoIconoSeguro: hotel.concepto?.icono
                    ? this.sanitizer.bypassSecurityTrustHtml(hotel.concepto.icono)
                    : null,
                descuentoSeguro: hotel.descuento?.icono
                    ? this.sanitizer.bypassSecurityTrustHtml(hotel.descuento.icono)
                    : null
            }));

            if (this.tipoDestino === 2) {
                this.gruposDestinos = this.agruparHotelesPorDestino(info)
            }

            this.destinoSeleccionado(info);
            this.listaHoteles = info;
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
        if (this.intervalId) clearInterval(this.intervalId);
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

    async obtenerDestinos() {
        this.tipoDestino = sessionStorage.getItem('tipoDestino') !== null ? +sessionStorage.getItem('tipoDestino') : this.tipoDestino
        const { data, error } = await this.supabase.obtenerDestinos(this.tipoDestino);
        if (error) { this.error = error.message; return; }

        this.destinos = data;

        const ciudad = sessionStorage.getItem('ciudad') !== null ? sessionStorage.getItem('ciudad') : +this.destinoId;

        this.listaHoteles = JSON.parse(sessionStorage.getItem('hoteles'));

        this.hotelesForm.patchValue({ hotelSeleccionado: +ciudad });

        this.hotelesForm.get('hotelSeleccionado')?.valueChanges.subscribe(valor => {
            this.consulaHoteles();

            sessionStorage.setItem('ciudad', valor.toString())

            const destino = this.listaHotelesFiltrada.find(item => item.ciudad.trim() === valor);

        });

        this.consulaHoteles();
    }

    async consulaHoteles() {
        if (this.tipoDestino === 2) {
            const mapa = new Map<string, any[]>();
            this.destinos.forEach(dest => {
                const padre = dest.continente.nombre;
                if (!mapa.has(padre)) mapa.set(padre, []);
                mapa.get(padre)!.push(dest);
            });

            this.agrupadosDestinos = Array.from(mapa, ([nombrePadre, destinos]) => ({
                nombrePadre,
                destinos
            }));
            this.filteredAgrupadosDestinos = this.agrupadosDestinos;

            this.destinoCtrl.valueChanges
                .pipe(startWith(''))
                .subscribe(value => {
                    const filtro = (value || '').toLowerCase();

                    this.filteredAgrupadosDestinos = this.agrupadosDestinos
                        .map(grupo => ({
                            nombrePadre: grupo.nombrePadre,
                            destinos: grupo.destinos.filter((d: any) =>
                                d.nombre.toLowerCase().includes(filtro)
                            )
                        }))
                        .filter(grupo => grupo.destinos.length > 0);
                });

        }

        const hotelId = +this.hotelesForm.get('hotelSeleccionado')?.value
        this.destinoSelected = this.destinos.find(item => item.id === +hotelId);
        const busqueda = this.tipoDestino === 1 ? this.supabase.listHotelesAll(hotelId, getDefaultLang()) : this.supabase.listHotelesAllPorDestinoPadre(hotelId, getDefaultLang());
        const data = await busqueda;

        const info = (data ?? []).map((hotel: any) => ({
            ...hotel,
            conceptoIconoSeguro: hotel.concepto?.icono
                ? this.sanitizer.bypassSecurityTrustHtml(hotel.concepto.icono)
                : null,
            descuentoSeguro: hotel.descuento?.icono
                ? this.sanitizer.bypassSecurityTrustHtml(hotel.descuento.icono)
                : null
        }));

        if (this.tipoDestino === 2) {
            this.gruposDestinos = this.agruparHotelesPorDestino(info)
        }
        this.splashScreen.hide();
        this.mostrarInfo = true;
        this.destinoSeleccionado(info);
        this.listaHoteles = info;

    }

    destinoSeleccionado(event) {
        if (event.length > 0) {
            sessionStorage.setItem('tipoDestino', event[0].destinos.tipo_desino_id)
        }

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


        // if (ciudad) {
        //     const destino = this.listaHotelesFiltrada.find(item => item.ciudad.trim() === ciudad.trim());

        //     if (destino) {
        //         this.hotelesForm.patchValue({ hotelSeleccionado: ciudad.trim() });
        //         this.destinoSeleccionado(destino);
        //     } else {
        //         this.destinoSeleccionado(destino);

        //     }
        // }

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
        this.splashScreen.show();
        const { data, error } = await this.supabase.obtenerDestinos(this.tipoDestino);
        if (error) { this.error = error.message; return; }
        this.destinos = data;
        let ciudad = this.destinos[0].id
        this.hotelesForm.patchValue({ hotelSeleccionado: +ciudad });
    }

    agruparHotelesPorDestino(
        hoteles: any[]
    ): GrupoDestino[] {
        const mapa = new Map<string, HotelConDestino[]>();

        hoteles.forEach(hotel => {
            const ciudad = hotel.destinos?.nombre ?? 'Sin destino';
            const pais = hotel.destinos?.destino_padre?.nombre ?? '';
            const key = pais ? `${ciudad}, ${pais}` : ciudad;

            if (!mapa.has(key)) {
                mapa.set(key, []);
            }

            mapa.get(key)!.push(hotel);
        });

        return Array.from(mapa.entries()).map(([destino, hoteles]) => ({
            destino,
            hoteles
        }));
    }

    cargarDestinos(id: number) {
        this.tipoDestino = id;
        this.obtenerSoloDestinos();

    }

    startRandomCarousel(): void {
        this.intervalId = setInterval(() => {
            if (this.mostrarInfo) {
                clearInterval(this.intervalId);
                return;
            }

            if (!this.imagenesFondo || this.imagenesFondo.length === 0) {
                return;
            }


            let newIndex: number;

            // Elegir índice aleatorio distinto al anterior (si hay más de 1 imagen)
            do {
                newIndex = Math.floor(Math.random() * this.imagenesFondo.length);
            } while (newIndex === this.previousIndex && this.imagenesFondo.length > 1);

            this.previousIndex = newIndex;
            const nuevaUrl = this.imagenesFondo[newIndex];

            // Usar transición en lugar de asignar directo
            this.cambiarFondoConTransicion(nuevaUrl);

        }, 3000); // 5 segundos
    }

    cambiarFondoConTransicion(url: string): void {
        // Si ya estamos en transición, opcional: ignorar para no encimar
        if (this.isTransitioning) {
            return;
        }

        const img = new Image();
        img.onload = () => {
            // Nueva imagen lista en memoria
            this.overlayImage = url;
            this.isTransitioning = true;

            // Duración debe coincidir con la del CSS (500ms)
            setTimeout(() => {
                this.currentImage = url;      // Actualizamos el fondo base
                this.isTransitioning = false; // Fin de transición
                this.overlayImage = null;     // Quitamos la capa extra
            }, 500);
        };

        img.onerror = () => {
            console.warn('Error cargando imagen de fondo', url);
        };

        img.src = url;
    }

    async obtenerSoloDestinos() {
        this.tipoDestino = sessionStorage.getItem('tipoDestino') !== null ? +sessionStorage.getItem('tipoDestino') : this.tipoDestino
        const { data, error } = await this.supabase.obtenerDestinos(this.tipoDestino);
        if (error) { this.error = error.message; return; }

        this.destinos = data;

        if (this.tipoDestino === 2) {
            const mapa = new Map<string, any[]>();
            this.destinos.forEach(dest => {
                const padre = dest.continente.nombre;
                if (!mapa.has(padre)) mapa.set(padre, []);
                mapa.get(padre)!.push(dest);
            });

            this.agrupadosDestinos = Array.from(mapa, ([nombrePadre, destinos]) => ({
                nombrePadre,
                destinos
            }));
        }
    }

    cargaInfo(item) {
        this.destinoId = this.tipoDestino === 1 ? +item.id : +item.destinos[0].id
        sessionStorage.setItem('ciudad', this.destinoId.toString())

        this.obtenerDestinos();
    }


    onDestinoChange(event: MatSelectChange): void {
        if (this.modoDestino === 'padres') {
            // 1) Eligió un padre (usamos nombrePadre)
            const nombrePadre = event.value as string;

            this.grupoSeleccionado = this.agrupadosDestinos.find(
                g => g.nombrePadre === nombrePadre
            ) ?? null;

            this.modoDestino = 'hijos';

            // limpiamos el control porque todavía NO hay destino final
            this.hotelesForm.get('hotelSeleccionado')?.setValue(null, { emitEvent: false });

            // reabrimos para que vea los hijos
            setTimeout(() => this.selectDestinoInternacionales.open());
        } else {
            // 2) Ya eligió un hijo → guardamos el id del destino
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

    abrirAviso() {
        this.avisoUrl = this.supabase.getPublicUrl(
            'Public-docs',
            'aviso-privacidad.pdf'
        );

        window.open(this.avisoUrl, '_blank');
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

    async obtenerImagenesFondo() {
        this.imagenesFondo = await this.supabase.getImagenesFondo();

        if (!this.imagenesFondo?.length) return;

        // ✅ 1) Mostrar la primera imagen inmediatamente (sin esperar al interval)
        const firstIndex = Math.floor(Math.random() * this.imagenesFondo.length);
        this.previousIndex = firstIndex;

        const firstUrl = this.imagenesFondo[firstIndex];

        // (opcional pero recomendado) precarga para evitar parpadeo/latencia
        await this.preloadImage(firstUrl);

        this.cambiarFondoConTransicion(firstUrl);

        // ✅ 2) Ya después arrancas el carrusel
        this.startRandomCarousel();
    }

    private preloadImage(url: string): Promise<void> {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve(); // no bloquea si falla
            img.src = url;
        });
    }


    showOverlay(): void {
        this.heroCard.face = 'back';

        if (!this.overlayAnimatedOnce) {
            setTimeout(() => {
                this.overlayAnimatedOnce = true;
            }, 350); // ajusta al tiempo del flip
        }
    }

    hideOverlay(): void {
        this.heroCard.face = 'front';
        this.overlayAnimatedOnce = false;

    }
}
