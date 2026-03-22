import { HttpClient } from '@angular/common/http';
import { Component, computed, ElementRef, inject, QueryList, signal, ViewChild, ViewChildren, ViewEncapsulation } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaterialModule } from 'app/shared/material.module';
import { JsonpClientBackend, HttpClientJsonpModule } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Hotel, IActividades, IAsesores, IDetalleHotel, IHoteles } from '../hoteles.interface';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';
import moment from 'moment';
import { MapaComponent } from '../mapa/mapa.component';
import { QRCodeComponent } from 'angularx-qrcode';
import { TextTypewriterComponent } from 'app/text-typewriter.component';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { SupabaseService } from 'app/core/supabase.service';
import { FuseSplashScreenService } from '@fuse/services/splash-screen';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { FooterComponent } from 'app/footer/footer.component';
import { getDefaultLang } from 'app/lang.utils';
import { ImagenesCarruselComponent } from 'app/shared/imagenes-carrusel/imagenes-carrusel.component';
import { BotCotizadorComponent } from 'app/bot-cotizador/bot-cotizador.component';


type Room = { adults: number; children: number; childAges: (number | null)[] };
@Component({
    selector: 'detalle-hotel',
    standalone: true,
    templateUrl: './detalle-hotel.component.html',
    imports: [MaterialModule, MapaComponent, TranslocoModule, FooterComponent, ImagenesCarruselComponent, BotCotizadorComponent
        //  QRCodeComponent, 
    ],
    encapsulation: ViewEncapsulation.None,
})
export class DetalleHotelComponent {
    private router = inject(Router);
    private _fuseMediaWatcherService = inject(FuseMediaWatcherService)
    private supabase = inject(SupabaseService);
    private route = inject(ActivatedRoute)
    private splashScreen = inject(FuseSplashScreenService)
    private _translocoService = inject(TranslocoService);


    //  urlQR = 'https://trotapie.github.io/Trotapie/hoteles';
    hotel: IDetalleHotel;
    descripcionParrafo: string = '';
    descripcionLista: IActividades[] = [];
    imagenes: string[] = [];
    imagenesFilter: string[] = [];
    scrolled = false;
    modalAbierto = false;
    reservacionForm: FormGroup;
    hoy: string;
    isScreenSmall: boolean;
    imagenSeleccionadaIndex = 0;

    @ViewChild('scrollContainer') scrollContainer!: ElementRef;
    mostrarMapa = false;
    mostrarBot = false;
    isDragging = false;
    startX = 0;
    scrollLeft = 0;
    isClicking = false;
    intervalId: any;
    mesActual = new Date();
    verMasDescripcion = false;
    dateFilter = (date: Date | null): boolean => {
        if (!date) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const d = new Date(date);
        d.setHours(0, 0, 0, 0);


        return d >= today;
    }

    primeraSeleccion: moment.Moment | null = null;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    private scrollManual = true;


    onDragBound!: (e: MouseEvent) => void;
    endDragBound!: () => void;

    items = this.imagenesFilter.map(src => ({
        src,
        w: 1200,
        h: 800
    }));

    isOpen = false;
    currentIndex = 0;
    current: { src: string; alt?: string } = { src: '' };
    show = false;
    origin = 'center center';
    // opcionesRegimen: any[]
    @ViewChild('overlay') overlay?: ElementRef<HTMLDivElement>;
    @ViewChild('modalImg') modalImg?: ElementRef<HTMLImageElement>;
    // @ViewChild('overlay') overlay?: ElementRef<HTMLDivElement>;
    @ViewChildren('thumbBtn') thumbBtns?: QueryList<ElementRef<HTMLButtonElement>>;

    ubicacion: string;
    mostrarInfo: boolean = false;
    otroId: number;
    tiposImagen: any[] = [];
    selectedTipoId: number = 0;
    trackById = (_: number, item: any) => item.id;
    readonly panelOpenState = signal(false);

    constructor(private sanitizer: DomSanitizer) {
        const nav = this.router.getCurrentNavigation();
        this.hotel = nav?.extras.state?.hotel;
    }

    async ngOnInit() {
        this.splashScreen.show();
        this._fuseMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({ matchingAliases }) => {
                this.isScreenSmall = !matchingAliases.includes('md');
            });

        const id = Number(this.route.snapshot.paramMap.get('id'));
        const data = await this.supabase.infoHotel(id, getDefaultLang());

        this.hotel = data;
        const actividades: string[] =
            (data?.actividades ?? []).flatMap((row: any) => {
                const a = row?.actividad;
                if (Array.isArray(a)) {
                    return a.map(z => z?.descripcion).filter(Boolean);
                }
                return a?.descripcion ? [a.descripcion] : [];
            });

        this.descripcionParrafo = this.hotel.descripcion;
        this.descripcionLista = this.hotel.actividades;
        this.ubicacion = this.hotel.ubicacion;

        this.mostrarInfo = true;
        this.splashScreen.hide();

        this._translocoService.langChanges$.subscribe(async (activeLang) => {
            const data = await this.supabase.infoHotel(id, activeLang);

            this.hotel = data;
            this.descripcionParrafo = this.hotel.descripcion;
            this.descripcionLista = this.hotel.actividades;
            this.ubicacion = this.hotel.ubicacion;


        });
    }


    ngAfterViewInit(): void {
        this.onDragBound = this.onDrag.bind(this);
        this.endDragBound = this.endDrag.bind(this);
    }

    ngOnDestroy() {
        clearInterval(this.intervalId);
    }

    regresar() {
        this.router.navigate(['/hoteles']);
    }


    abrirModal() {
        this.mostrarBot = true;
    }

    cerrarModal() {
        this.modalAbierto = false;
        this.mostrarBot = false;
    }

    startDrag(event: MouseEvent): void {
        this.isDragging = true;
        this.startX = event.pageX - this.scrollContainer.nativeElement.offsetLeft;
        this.scrollLeft = this.scrollContainer.nativeElement.scrollLeft;

        document.addEventListener('mousemove', this.onDragBound);
        document.addEventListener('mouseup', this.endDragBound);

        this.scrollContainer.nativeElement.classList.add('scrolling');
    }

    endDrag = (): void => {
        this.isDragging = false;
        document.removeEventListener('mousemove', this.onDragBound);
        document.removeEventListener('mouseup', this.endDragBound);
        this.scrollContainer.nativeElement.classList.remove('scrolling');
    };

    onDrag = (event: MouseEvent): void => {
        if (!this.isDragging) return;
        event.preventDefault();
        const x = event.pageX - this.scrollContainer.nativeElement.offsetLeft;
        const walk = (x - this.startX) * 1.5;
        this.scrollContainer.nativeElement.scrollLeft = this.scrollLeft - walk;
    };

    onScroll(): void {
        if (!this.scrollManual) return;

        const container = this.scrollContainer.nativeElement as HTMLElement;
        const children = Array.from(container.children) as HTMLElement[];

        const containerCenter = container.scrollLeft + container.offsetWidth / 2;

        let closestIndex = 0;
        let closestDistance = Infinity;

        children.forEach((child, index) => {
            const childCenter = child.offsetLeft + child.offsetWidth / 2;
            const distance = Math.abs(containerCenter - childCenter);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });

        this.imagenSeleccionadaIndex = closestIndex;
    }

    seleccionarImagen(index: number): void {
        this.imagenSeleccionadaIndex = index;
        this.scrollAImagen(index, true);
    }


    scrollAImagen(index: number, reacomodar?: boolean): void {
        const container = this.scrollContainer.nativeElement as HTMLElement;
        const children = Array.from(container.children) as HTMLElement[];
        const target = children[index];

        if (!target) return;

        this.scrollManual = false;

        const containerCenter = container.offsetWidth / 2;
        const targetCenter = target.offsetLeft + target.offsetWidth / 2;
        if (reacomodar) {

            const newScrollLeft = targetCenter - containerCenter;

            container.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
        }

        setTimeout(() => {
            this.scrollManual = true;
        }, 500);
    }

    abrirUbicacion() {
        this.mostrarMapa = !this.mostrarMapa;
    }

    cerrarMapa() {
        this.mostrarMapa = false;
    }

    get currentYear(): number {
        return new Date().getFullYear();
    }

    sanitizeImage(url: string): SafeStyle {
        return this.sanitizer.bypassSecurityTrustStyle(`url(${url})`);
    }

    private getIdFromDriveUrl(url: string): string | null {
        // Extrae el id=... de la URL thumbnail
        const m = url.match(/[?&]id=([^&]+)/i);
        return m ? m[1] : null;
    }


    async compartirHotel() {
        const shareData = {
            title: document.title,
            text: '¡Mira esto!',
            url: location.href
        };
        if (navigator.share) {
            try { await navigator.share(shareData); }
            catch (e) { }
        } else {
            await navigator.clipboard?.writeText(shareData.url);
            alert('Enlace copiado 😄');
        }

    }

    toggleVerMas(element: HTMLElement): void {
    const estabaExpandido = this.verMasDescripcion;

    this.verMasDescripcion = !this.verMasDescripcion;

    if (estabaExpandido) {
        setTimeout(() => {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'center', // o 'nearest' si lo quieres más preciso
            });
        }, 50);
    }
}
}
