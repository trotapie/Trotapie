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
import { TranslocoModule } from '@jsverse/transloco';
import { FooterComponent } from 'app/footer/footer.component';

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

    imagenesFondo: string[] = [
        "https://drive.google.com/thumbnail?id=1Q6E32Aa9rNXCDaL47Zcg5cUfvZBASoeG&sz=w1000",
        "https://drive.google.com/thumbnail?id=1DR14XXgmvxAf3vcz5HutWqiG9PiNTZTF&sz=w1000",
        "https://drive.google.com/thumbnail?id=1mTCXsQkjZvuJPfcOFhr_jKyAe_gVXbZB&sz=w1000",
        "https://drive.google.com/thumbnail?id=1UOu1C_fHtFIH5bvjLxoV6e0AV7Vb1q5a&sz=w1000",
        "https://drive.google.com/thumbnail?id=1uj8AXBKudr6XSbhQ5zt3oL8jLOOZl8tb&sz=w1000",
        "https://drive.google.com/thumbnail?id=1kYc-T_98hX3OajRkIC60NL1eIa-KS30G&sz=w1000",
        "https://drive.google.com/thumbnail?id=1q9h_2-lSbN-DviEwmegh4xYELwHQ7P5Q&sz=w1000",
        "https://drive.google.com/thumbnail?id=1I0GldQOhTkBECpgnFz5kqOKngakOs8Kx&sz=w1000",
        "https://drive.google.com/thumbnail?id=1YhrutZIWTC-gN2zFeffTK8jf_fEfRO77&sz=w1000",
        "https://drive.google.com/thumbnail?id=1EegP__rdUuEXll5jCcE2MQW_8lcpEhuq&sz=w1000",
        "https://drive.google.com/thumbnail?id=1B7bJTtDz3APLntNMNlDDnz3oGIrsMC_y&sz=w1000",
        "https://drive.google.com/thumbnail?id=1m1JbVRhlJ5_i5b9JSJvs6ypHGXYUh11S&sz=w1000",
        "https://drive.google.com/thumbnail?id=1Z5168bwD12P3-SuDZiCrlGMv_Lrz5VCl&sz=w1000",
        "https://drive.google.com/thumbnail?id=1cHzOSB-V2f8SfukL2O9CjS5FCU1UpMfT&sz=w1000",
        "https://drive.google.com/thumbnail?id=1gcqmiVNiqMEuhUEcHqTuMlQvw7H2dli_&sz=w1000",
        "https://drive.google.com/thumbnail?id=1ft0gXlfbyvJqyHGcBRsavLdFr2fEBq1U&sz=w1000",
        "https://drive.google.com/thumbnail?id=1uiCSrjJDbnelZr0MJ180Q1oUZ4mHVLkO&sz=w1000",
        "https://drive.google.com/thumbnail?id=1qrDfwAQh2zOObo8hhREfVDNqtUPWOYbt&sz=w1000",
        "https://drive.google.com/thumbnail?id=1VxW2JmXdSJy9C4DmT_0XzYRbBMjMn3q1&sz=w1000",
        "https://drive.google.com/thumbnail?id=1D9_5Tu1JfnmjSrztYJ8blDAFKzier0k7&sz=w1000",
        "https://drive.google.com/thumbnail?id=1mRCJUiL3eA6NzensOapN979n_OUQVvRI&sz=w1000",
        "https://drive.google.com/thumbnail?id=18ThG9EodNlDDaMbbieCXKaEYIk8FnO2k&sz=w1000",
        "https://drive.google.com/thumbnail?id=1sNuG16LoSht6-GnPzBoKx7RSOgOuoz8D&sz=w1000",
        "https://drive.google.com/thumbnail?id=1qHNRx3X9Vt-P_sNuljzbpiVtaf0GvYcn&sz=w1000",
        "https://drive.google.com/thumbnail?id=1z6yyTFfjZw1SNVt9hX29M55hLh460Po6&sz=w1000",
        "https://drive.google.com/thumbnail?id=1rOH_ew4Agvue5xUM3P13dG_3tUKVedSB&sz=w1000",
        "https://drive.google.com/thumbnail?id=1eHodrousb_xsMqSRkzYIoQCuzOEeQKkG&sz=w1000",
        "https://drive.google.com/thumbnail?id=1AOoWvLTh-OLAQxtX3gn-OMraBVP6EcA2&sz=w1000",
        "https://drive.google.com/thumbnail?id=1TSRdTrsVLfIxbCqVvX1lvUYD5OR-fwAb&sz=w1000",
        "https://drive.google.com/thumbnail?id=1sdWK0nAX5z8qIP6Lr4bOA8eGFY2pWAao&sz=w1000",
        "https://drive.google.com/thumbnail?id=1h1ule8mVMHPCGzsoa15KZyEu1S3_PTB0&sz=w1000",
        "https://drive.google.com/thumbnail?id=1udMVdovNXtEArX34u1CH_PaF9ItLPeo3&sz=w1000",
        "https://drive.google.com/thumbnail?id=1ozJbVtR0Z4l77kCZSXJ8r6qHjVcuqinG&sz=w1000",
        "https://drive.google.com/thumbnail?id=1mgh0-0w14yq1cWoIYboriuxy7-b135Rp&sz=w1000",
        "https://drive.google.com/thumbnail?id=1YRC8tBd3s46TWoAaScqf9liI_gUVpKQ-&sz=w1000",
        "https://drive.google.com/thumbnail?id=1jX8TZ8zcM0pXO5VBbxKe38VXk5PNBvr6&sz=w1000",
        "https://drive.google.com/thumbnail?id=1x7kXdUFITBtY5vwcyXQ_MKdLUgZNYDKU&sz=w1000",
        "https://drive.google.com/thumbnail?id=1YSgzo_EBx8gt8G-T5SiKeJw5UieDPYvK&sz=w1000",
        "https://drive.google.com/thumbnail?id=1GIdKR2O8JVAMbN0_U_nUuNMDr15HWX3v&sz=w1000",
        "https://drive.google.com/thumbnail?id=10iWgNkT0zjF7STL98swzmXAXPssacaaf&sz=w1000"
    ];

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

    avisoUrl = '';

    filtroDestino: string = '';
    constructor() {
    }

    async ngOnInit() {
        // this.obtenerContinentes();
        this.obtenerSoloDestinos();
        this.hotelesForm = this.formBuilder.group({
            hotelSeleccionado: ['']
        });
        if (sessionStorage.getItem('tipoDestino') !== null) {
            this.obtenerDestinos()
            this.splashScreen.show();
        }

        this.startRandomCarousel();
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
        const busqueda = this.tipoDestino === 1 ? this.supabase.listHotelesAll(hotelId) : this.supabase.listHotelesAllPorDestinoPadre(hotelId);
        const { data, error } = await busqueda;

        if (error) { this.error = error.message; return; }
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
            // sessionStorage.setItem('ciudad', event.destinos.nombre)
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

        console.log(slug);
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

    // async obtenerContinentes() {
    //     // const { data, error } = await this.supabase.continentes();
    //     const { data, error } = await this.supabase.obtenerDestinos(2);
    //     this.destinos = data;
    // }

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
    /** Offset absoluto del target dentro del container (sin usar window). */
    private getOffsetWithinContainer(target: HTMLElement, container: HTMLElement): number {
        let y = 0;
        let node: HTMLElement | null = target;
        while (node && node !== container) {
            y += node.offsetTop;
            node = node.offsetParent as HTMLElement | null;
        }
        return y;
    }

    /** Altura del header sticky visible (para que no tape el título) + un respiro. */
    private getStickyOffset(container: HTMLElement): number {
        let offset = 0;
        const stickies = container.querySelectorAll<HTMLElement>('.sticky.top-0');
        stickies.forEach(el => offset = Math.max(offset, el.offsetHeight || 0));
        return offset + 8; // 8px de respiro
    }

}
