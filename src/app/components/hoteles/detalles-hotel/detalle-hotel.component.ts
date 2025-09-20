import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, inject, QueryList, ViewChild, ViewChildren, ViewEncapsulation } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaterialModule } from 'app/shared/material.module';
import { JsonpClientBackend, HttpClientJsonpModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { Hotel, IHoteles } from '../hoteles.interface';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { Subject, takeUntil } from 'rxjs';
import moment from 'moment';
import { MapaComponent } from '../mapa/mapa.component';
import { QRCodeComponent } from 'angularx-qrcode';
import { TextTypewriterComponent } from 'app/text-typewriter.component';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';

@Component({
    selector: 'detalle-hotel',
    standalone: true,
    templateUrl: './detalle-hotel.component.html',
    imports: [MaterialModule, MapaComponent,
        //  QRCodeComponent, 
],
    encapsulation: ViewEncapsulation.None,
})
export class DetalleHotelComponent {
    private formBuilder = inject(FormBuilder);
    private router = inject(Router);
    private _fuseMediaWatcherService = inject(FuseMediaWatcherService)

    //  urlQR = 'https://trotapie.github.io/Trotapie/hoteles';
    hotel: Hotel;
    descripcionParrafo: string = '';
    descripcionLista: string[] = [];
    imagenes: string[] = [];
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
    get edadesNinos() {
        return this.reservacionForm.get('edadesNinos') as FormArray;
    }

    onDragBound!: (e: MouseEvent) => void;
    endDragBound!: () => void;

    items = this.imagenes.map(src => ({
        src,
        w: 1200,
        h: 800
    }));

    isOpen = false;
    currentIndex = 0;
    current: { src: string; alt?: string } = { src: '' };
    show = false;
    origin = 'center center';
    opcionesRegimen: string[]
    @ViewChild('overlay') overlay?: ElementRef<HTMLDivElement>;
    @ViewChild('modalImg') modalImg?: ElementRef<HTMLImageElement>;
    // @ViewChild('overlay') overlay?: ElementRef<HTMLDivElement>;
    @ViewChildren('thumbBtn') thumbBtns?: QueryList<ElementRef<HTMLButtonElement>>;
    constructor(private sanitizer: DomSanitizer) {
        const nav = this.router.getCurrentNavigation();
        this.hotel = nav?.extras.state?.hotel;
    }

    ngOnInit() {
        this._fuseMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({ matchingAliases }) => {
                this.isScreenSmall = !matchingAliases.includes('md');
            });
        this.hotel = JSON.parse(sessionStorage.getItem('hotel'))

        this.opcionesRegimen =this.hotel.descripcion.resultadoRegimen
        this.descripcionParrafo = this.hotel.descripcion.descripcion;
        this.descripcionLista = this.hotel.descripcion.resultadoActividades;

        this.cargarImagenesConDelay();

    }

    ngAfterViewInit(): void {
        this.onDragBound = this.onDrag.bind(this);
        this.endDragBound = this.endDrag.bind(this);
    }

    ngOnDestroy() {
        clearInterval(this.intervalId);
    }

    async cargarImagenesConDelay() {
        this.imagenes = [];
        for (const img of this.hotel.imagenes) {
            await this.delay(300);
            this.imagenes.push(img);
        }
    }

    delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    regresar() {
        window.history.back();
    }

    abrirWhatsApp() {
        const ciudad = sessionStorage.getItem('ciudad');

        const { adultos, ninos, noches, rangoFechas, edadesNinos, nombre, apellido } = this.reservacionForm.getRawValue();

        const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

        const fechaInicio = new Date(rangoFechas.start);
        const diaInicio = fechaInicio.getDate().toString().padStart(2, '0');
        const mesInicio = meses[fechaInicio.getMonth()];
        const anioInicio = fechaInicio.getFullYear();
        const fechaFormateadaInicio = `${diaInicio}/${mesInicio}/${anioInicio}`;

        const fechaFin = new Date(rangoFechas.end);
        const diaFin = fechaFin.getDate().toString().padStart(2, '0');
        const mesFin = meses[fechaFin.getMonth()];
        const anioFin = fechaFin.getFullYear();
        const fechaFormateadaFin = `${diaFin}/${mesFin}/${anioFin}`;

        let edadesTexto = '';
        if (ninos > 0 && edadesNinos?.length) {
            const edadesFormateadas = edadesNinos.map((edad: number) => `${edad}`).join(', ');
            edadesTexto = `Edades de los niños: ${edadesFormateadas} años\n`;
        }

        const mensaje = `Hola, soy ${nombre} ${apellido} y me interesa una cotización en el hotel ${this.hotel.nombre} en ${ciudad}.
Adultos: ${adultos}
Niños: ${ninos}
${edadesTexto}Noches: ${noches}
Fecha de entrada: ${fechaFormateadaInicio}
Fecha de salida: ${fechaFormateadaFin}`;

        window.open(`https://wa.me/5216188032003?text=${encodeURIComponent(mensaje)}`);
    }


    abrirModal() {
        this.mostrarBot = true;
        const hoyDate = new Date();
        this.hoy = hoyDate.toISOString().split('T')[0];
        // this.modalAbierto = true;
        this.reservacionForm = this.formBuilder.group({
            regimen: [''],
            nombre: ['', [Validators.required]],
            apellido: ['', [Validators.required]],
            adultos: ['', [Validators.required, Validators.min(1)]],
            ninos: ['', [Validators.min(0)]],
            noches: [{ value: '', disabled: true }, [Validators.required, Validators.min(1)]],
            rangoFechas: this.formBuilder.group({
                start: [null],
                end: [null],
            }),
            edadesNinos: this.formBuilder.array([]),
        });

        this.reservacionForm.get('ninos')!.valueChanges.subscribe(cantidad => {
            this.actualizarEdadesNinos(cantidad);
        });

        this.actualizarEdadesNinos(0);

        this.reservacionForm.get('rangoFechas')!.valueChanges.subscribe(range => {
            this.calcularNoches(range?.start, range?.end);
        });
    }

    actualizarEdadesNinos(cantidad: number) {
        while (this.edadesNinos.length !== 0) {
            this.edadesNinos.removeAt(0);
        }

        for (let i = 0; i < cantidad; i++) {
            this.edadesNinos.push(this.formBuilder.control('', [Validators.required, Validators.min(0), Validators.max(17)]));
        }
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

    calcularNoches(start: Date | null, end: Date | null): void {
        if (start && end) {
            const startDate = new Date(start);
            const endDate = new Date(end);

            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);

            const diffMs = endDate.getTime() - startDate.getTime();
            const noches = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (noches > 0) {
                this.reservacionForm.get('noches')?.setValue(noches);
            } else {
                this.reservacionForm.get('noches')?.setValue('');
            }
        } else {
            this.reservacionForm.get('noches')?.setValue('');
        }
    }


    // abrirUbicacion() {
    //     window.open(this.hotel.descripcion.ubicacion, '_blank');
    // }


    abrirUbicacion() {
        this.mostrarMapa = true;
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

    big(url: string): string {
        const id = this.getIdFromDriveUrl(url);
        if (!id) return url;
        return `https://drive.google.com/uc?export=view&id=${id}`;
        // Alternativa (a veces más rápida):
        // return `https://lh3.googleusercontent.com/d/${id}=w1600`;
    }

    small(url: string): string {
        return url.replace(/sz=w\d+/i, 'sz=w400');
    }

    private updateCurrent() {
        this.current = {
            src: this.imagenes[this.currentIndex],
            alt: `Imagen ${this.currentIndex + 1}/${this.imagenes.length}`
        };
        // (Opcional) asegurar miniatura activa a la vista
        setTimeout(() => {
            const btn = this.thumbBtns?.get(this.currentIndex)?.nativeElement;
            btn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        });
    }

    open(i: number, event: MouseEvent) {
        this.currentIndex = i;
        this.updateCurrent();

        const target = event.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const originX = ((event.clientX - rect.left) / rect.width) * 100;
        const originY = ((event.clientY - rect.top) / rect.height) * 100;
        this.origin = `${originX}% ${originY}%`;

        this.isOpen = true;
        setTimeout(() => (this.show = true), 10);
    }

    close() {
        this.show = false;
        setTimeout(() => (this.isOpen = false), 300);
    }

    next(event: Event) {
        event.stopPropagation();
        this.currentIndex = (this.currentIndex + 1) % this.imagenes.length;
        this.updateCurrent();
    }

    prev(event: Event) {
        event.stopPropagation();
        this.currentIndex = (this.currentIndex - 1 + this.imagenes.length) % this.imagenes.length;
        this.updateCurrent();
    }

    goTo(i: number, event: Event) {
        event.stopPropagation();
        this.currentIndex = i;
        this.updateCurrent();
    }

    onBackdrop(event: MouseEvent) {
        if (event.target === this.overlay?.nativeElement) this.close();
    }

    onDragStart(event: PointerEvent) {
        event.preventDefault();
    }

    onThumbsWheel(event: WheelEvent) {
        const el = event.currentTarget as HTMLElement | null;
        if (!el) return;

        // Si el usuario está scrolleando verticalmente, lo traducimos a horizontal en la tira
        const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
            ? event.deltaY
            : event.deltaX;

        // Desplaza la tira
        el.scrollLeft += delta;

        // Nota: evitar preventDefault() aquí porque los listeners de 'wheel'
        // suelen ser pasivos y el navegador lo ignoraría.
    }



}
