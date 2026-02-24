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


type Room = { adults: number; children: number; childAges: (number | null)[] };
@Component({
    selector: 'detalle-hotel',
    standalone: true,
    templateUrl: './detalle-hotel.component.html',
    imports: [MaterialModule, MapaComponent, TranslocoModule, FooterComponent, ImagenesCarruselComponent
        //  QRCodeComponent, 
    ],
    encapsulation: ViewEncapsulation.None,
})
export class DetalleHotelComponent {
    private formBuilder = inject(FormBuilder);
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
    get edadesNinos() {
        return this.reservacionForm.get('edadesNinos') as FormArray;
    }

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
    opcionesRegimen: any[]
    @ViewChild('overlay') overlay?: ElementRef<HTMLDivElement>;
    @ViewChild('modalImg') modalImg?: ElementRef<HTMLImageElement>;
    // @ViewChild('overlay') overlay?: ElementRef<HTMLDivElement>;
    @ViewChildren('thumbBtn') thumbBtns?: QueryList<ElementRef<HTMLButtonElement>>;

    form: boolean = false;
    readonly MAX_ROOMS = 3;
    readonly MAX_PER_ROOM = 6;
    readonly MIN_ADULTS = 1;

    rooms = signal<Room[]>([{ adults: 2, children: 0, childAges: [] }]);
    private plural = (palabra: string, n: number) => (n === 1 ? palabra : `${palabra}s`);

    ageOptions = Array.from({ length: 18 }, (_, i) => i); // 0..17 años

    totalRooms = computed(() => this.rooms().length);
    totalPeople = computed(() => this.rooms().reduce((a, r) => a + r.adults + r.children, 0));
    label = computed(() => `${this.totalRooms()} hab · ${this.totalPeople()} ${this.totalPeople() === 1 ? 'persona' : 'personas'}`);
    noches: number = 0;

    error = '';

    ubicacion: string;
    asesores: IAsesores[] = [];
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

        this.opcionesRegimen = this.hotel.regimenes;
        this.descripcionParrafo = this.hotel.descripcion;
        this.descripcionLista = this.hotel.actividades;
        this.ubicacion = this.hotel.ubicacion;

        this.mostrarInfo = true;
        this.splashScreen.hide();

        this.obtenerEmpleados();


        this._translocoService.langChanges$.subscribe(async (activeLang) => {
            const data = await this.supabase.infoHotel(id, activeLang);

            this.hotel = data;
            this.opcionesRegimen = this.hotel.regimenes;
            this.descripcionParrafo = this.hotel.descripcion;
            this.descripcionLista = this.hotel.actividades;
            this.ubicacion = this.hotel.ubicacion;
            this.asesores = this.asesores.map(e => ({
                ...e,
                nombre:
                    e.id === this.otroId
                        ? this._translocoService.translate('empleado_otro')
                        : e.nombre
            }));

        });
    }

    async obtenerEmpleados() {
        const { data, error } = await this.supabase.empleados();
        if (error) { this.error = error.message; return; }
        this.otroId = data.find(e => e.nombre === 'Otro')?.id;
        this.asesores = data.map(e => ({
            ...e,
            nombre:
                e.nombre === 'Otro'
                    ? this._translocoService.translate('empleado_otro')
                    : e.nombre
        }));
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

    async guardarCliente(mensaje) {
        const { telefono, ofertas, nombre, correo } = this.reservacionForm.getRawValue();

        try {
            const nuevoCliente = {
                nombre: nombre,
                email: correo,
                telefono: telefono,
                recibir_ofertas: ofertas
            };

            const data = await this.supabase.upsertCliente(nuevoCliente);

            const payload = {
                cliente_id: data.id,
                hotel_id: this.hotel.id,
                empleado_id: mensaje.asesor, 
                idioma: this._translocoService.getActiveLang(),
                regimen_id: mensaje.regimen?.id ?? null, 
                fecha_entrada: mensaje.entrada, 
                fecha_salida: mensaje.salida, 
                noches: this.noches,
                habitaciones: mensaje.detalleHabitaciones, 
                peticiones_especiales: mensaje.especiales?.trim() ? mensaje.especiales.trim() : null,
                recibir_ofertas: mensaje.recibirOfertas,
            };

            const solicitud = await this.supabase.crearSolicitudCotizacion(payload);

        } catch (err) {
            console.error('Error guardando cliente:', err);
        }
    }


    async abrirWhatsApp() {

        const ciudad = sessionStorage.getItem('ciudad') ?? '';

        const {
            regimen, rangoFechas, nombre, correo, telefono, asesor, especiales
        } = this.reservacionForm.getRawValue();

        const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

        const fechaInicio = new Date(rangoFechas.start);
        const fechaFormateadaInicio = `${String(fechaInicio.getDate()).padStart(2, '0')}/${meses[fechaInicio.getMonth()]}/${fechaInicio.getFullYear()}`;

        const fechaFin = new Date(rangoFechas.end);
        const fechaFormateadaFin = `${String(fechaFin.getDate()).padStart(2, '0')}/${meses[fechaFin.getMonth()]}/${fechaFin.getFullYear()}`;

        const rooms = this.rooms();
        const detalleHabitaciones = this.formatHabitaciones(rooms);
        const totalRooms = rooms.length;

        const mensaje = await this.buildCotizacionMensaje({
            nombre,
            hotel: this.hotel.nombre_hotel,
            ciudad: this.hotel.destino.nombre,
            noches: this.noches,
            regimen,
            entrada: fechaFormateadaInicio,
            salida: fechaFormateadaFin,
            habitaciones: totalRooms,
            detalleHabitaciones,
            especiales,
            telefono,
            correo,
            asesor: asesor.nombre,
        });

        const telefonoTrotapie = '526188032003'; 
        const url = `https://wa.me/${telefonoTrotapie}?text=${encodeURIComponent(mensaje)}`;

        window.open(url, '_blank');
        
        this.guardarCliente({
            nombre,
            hotel: this.hotel.nombre_hotel,
            ciudad,
            noches: this.noches,
            regimen,
            entrada: fechaInicio,
            salida: fechaFin,
            habitaciones: totalRooms,
            detalleHabitaciones,
            especiales,
            telefono,
            correo,
            asesor: asesor.id,
        });

    }

    private formatHabitaciones(rooms: Room[]): { traduccion: string; es: string } {
        const datos = {
            traduccion: rooms.map((r, i) => {
                const partes: string[] = [];

                partes.push(
                    `${r.adults} ${this.trPlural('adulto', 'adultos', r.adults)}`
                );

                if (r.children > 0) {
                    const ninosTxt = `${r.children} ${this.trPlural('nino', 'ninos', r.children)}`;

                    if (r.childAges?.length) {
                        const edades = r.childAges.join(', ');
                        const suf = this.trPlural('ano', 'anos', r.childAges.length);
                        partes.push(
                            `${ninosTxt} · ${this.trPlural('edad', 'edades', r.childAges.length)}: ${edades} ${suf}`
                        );
                    } else {
                        partes.push(ninosTxt);
                    }
                }

                return `${this._translocoService.translate('habitacion')} ${i + 1}: ${partes.join(' · ')}`;
            }).join('\n'),
            es: rooms.map((r, i) => {
                const partes: string[] = [];
                partes.push(`${r.adults} ${this.plural('adulto', r.adults)}`);

                if (r.children > 0) {
                    const ninos = `${r.children} ${this.plural('niño', r.children)}`;
                    if (r.childAges?.length) {
                        const edades = r.childAges.join(', ');
                        const suf = r.childAges.length === 1 ? 'año' : 'años';
                        partes.push(`${ninos} · edades: ${edades} ${suf}`);
                    } else {
                        partes.push(ninos);
                    }
                }

                return `Habitación ${i + 1}: ${partes.join(' · ')}`;
            }).join('\n')
        }
        return datos;
    }

    private trPlural(singularKey: string, pluralKey: string, count: number): string {
        return this._translocoService.translate(count === 1 ? singularKey : pluralKey);
    }


    abrirModal() {
        this.mostrarBot = true;
        const hoyDate = new Date();
        this.hoy = hoyDate.toISOString().split('T')[0];
        // this.modalAbierto = true;
        this.reservacionForm = this.formBuilder.group({
            regimen: ['', [Validators.required]],
            nombre: ['', [Validators.required]],
            correo: ['', [Validators.email]],
            rangoFechas: this.formBuilder.group({
                start: [null],
                end: [null],
            }),
            ofertas: [false],
            telefono: ['', [Validators.required, Validators.minLength(10)]],
            asesor: ['', Validators.required],
            especiales: ['']
        });

        this.reservacionForm.get('rangoFechas')!.valueChanges.subscribe(range => {
            this.calcularNoches(range?.start, range?.end);            
        });
        
        if (this.opcionesRegimen?.length === 1) {
            this.reservacionForm.get('regimen')?.patchValue(
                this.opcionesRegimen[0]
            );
        }

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
        this.form = false;
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
            const startDate = start;
            const endDate = end;

            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);

            const diffMs = endDate.getTime() - startDate.getTime();
            this.noches = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (this.noches > 0) {
                this.reservacionForm.get('noches')?.setValue(this.noches);
            } else {
                this.reservacionForm.get('noches')?.setValue('');
            }
        } else {
            this.reservacionForm.get('noches')?.setValue('');
        }
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



    onDragStart(event: PointerEvent) {
        event.preventDefault();
    }

    onThumbsWheel(event: WheelEvent) {
        const el = event.currentTarget as HTMLElement | null;
        if (!el) return;

        const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
            ? event.deltaY
            : event.deltaX;

        el.scrollLeft += delta;

    }

    abrirForm() {
        this.form = true;
    }


    private clampRoom(r: Room) {

        const total = r.adults + r.children;
        if (total > this.MAX_PER_ROOM) {
            const exceso = total - this.MAX_PER_ROOM;
            r.children = Math.max(0, r.children - exceso);
            r.childAges = r.childAges.slice(0, r.children);
        }
        r.adults = Math.max(this.MIN_ADULTS, r.adults);
    }

    incAdults(i: number) {
        const list = [...this.rooms()];
        const r = { ...list[i] };
        if (r.adults + r.children < this.MAX_PER_ROOM) {
            r.adults++;
            this.clampRoom(r);
            list[i] = r; this.rooms.set(list);
        }
    }
    decAdults(i: number) {
        const list = [...this.rooms()];
        const r = { ...list[i] };
        if (r.adults > this.MIN_ADULTS) {
            r.adults--;
            this.clampRoom(r);
            list[i] = r; this.rooms.set(list);
        }
    }

    incChildren(i: number) {
        const list = [...this.rooms()];
        const r = { ...list[i] };
        if (r.adults + r.children < this.MAX_PER_ROOM) {
            r.children++;
            r.childAges = [...r.childAges, null]; // agrega edad pendiente
            this.clampRoom(r);
            list[i] = r; this.rooms.set(list);
        }
    }
    decChildren(i: number) {
        const list = [...this.rooms()];
        const r = { ...list[i] };
        if (r.children > 0) {
            r.children--;
            r.childAges = r.childAges.slice(0, r.children); // quita última edad
            this.clampRoom(r);
            list[i] = r; this.rooms.set(list);
        }
    }

    addRoom() {
        if (this.rooms().length >= this.MAX_ROOMS) return;
        this.rooms.set([...this.rooms(), { adults: 2, children: 0, childAges: [] }]);
    }
    removeRoom(i: number) {
        if (this.rooms().length <= 1) return;
        const list = [...this.rooms()];
        list.splice(i, 1);
        this.rooms.set(list);
    }

    roomNeedsAges(r: Room) {
        return r.children > 0 && r.childAges.some(a => a === null);
    }
    hasMissingAges() {
        return this.rooms().some(r => this.roomNeedsAges(r));
    }

    setChildAge(i: number, j: number, age: number | null) {
        const list = [...this.rooms()];
        const r = { ...list[i], childAges: [...list[i].childAges] };
        r.childAges[j] = age;
        list[i] = r;
        this.rooms.set(list);
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

    private async buildCotizacionMensaje(params: Record<string, any>) {
        const active = this._translocoService.getActiveLang(); // idioma actual

        await firstValueFrom(this._translocoService.load(active));

        if (active !== 'es') {
            await firstValueFrom(this._translocoService.load('es'));
        }

        const msgActive = this._translocoService.translate('cotizacion-mensaje', params, active);

        if (active === 'es') return msgActive;

        const msgEs = this._translocoService.translate('cotizacion-mensaje', params, 'es');

        return [
            msgActive,
            '',
            '────────────',
            '',
            msgEs,
        ].join('\n');
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
