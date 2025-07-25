import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, inject, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaterialModule } from 'app/shared/material.module';
import { JsonpClientBackend, HttpClientJsonpModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { Hotel, IHoteles } from '../hoteles.interface';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { Subject, takeUntil } from 'rxjs';
import moment from 'moment';

@Component({
    selector: 'detalle-hotel',
    standalone: true,
    templateUrl: './detalle-hotel.component.html',
    imports: [MaterialModule],
    encapsulation: ViewEncapsulation.None,
})
export class DetalleHotelComponent {
    private formBuilder = inject(FormBuilder);
    private router = inject(Router);
    private _fuseMediaWatcherService = inject(FuseMediaWatcherService)


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

    isDragging = false;
    startX = 0;
    scrollLeft = 0;
    isClicking = false;
    intervalId: any;
    selectedDateRange: { startDate: moment.Moment; endDate: moment.Moment };

    fechasDelMes: Date[] = [];
    fechaEntrada: Date | null = null;
    fechaSalida: Date | null = null;
    localeEs = {
        applyLabel: 'Aplicar',
        cancelLabel: 'Cancelar',
        customRangeLabel: 'Rango personalizado',
        daysOfWeek: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'],
        monthNames: [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ],
        firstDay: 1, 
        format: 'DD/MM/YYYY'
    };
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    private scrollManual = true;
    get edadesNinos() {
        return this.reservacionForm.get('edadesNinos') as FormArray;
    }

    onDragBound!: (e: MouseEvent) => void;
    endDragBound!: () => void;

    constructor() {
        const nav = this.router.getCurrentNavigation();
        this.hotel = nav?.extras.state?.hotel;
    }

    ngOnInit() {
        this.hotel = JSON.parse(sessionStorage.getItem('hotel'))
        const partes = this.hotel.descripcion.split('\n');
        this.descripcionParrafo = partes[0];
        this.descripcionLista = partes.slice(1);
        this.cargarImagenesConDelay();

        this._fuseMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({ matchingAliases }) => {
                this.isScreenSmall = !matchingAliases.includes('md');
            });
        this.generarFechasDelMes();
        // this.iniciarCarruselAutomatico();
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

        const { adultos, ninos, noches, fecha, edadesNinos } = this.reservacionForm.value;

        const edadesTexto = edadesNinos.map((edad: number, index: number) => `${edad} años`).join(', ');

        console.log(this.hotel);
        const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        const [year, month, day] = fecha.split('-');
        const mesTexto = meses[parseInt(month, 10) - 1];
        const fechaFormateada = `${day}/${mesTexto}/${year}`;
        const mensaje = `Hola, me interesa una cotización en el hotel ${this.hotel.nombre} en ${ciudad}.
Adultos: ${adultos}
Niños: ${ninos}
Edades de los niños: ${edadesTexto}
Noches: ${noches}
Fecha de entrada: ${fechaFormateada}`;

        window.open(`https://wa.me/5216188032003?text=${encodeURIComponent(mensaje)}`);
    }

    abrirModal() {
        const hoyDate = new Date();
        this.hoy = hoyDate.toISOString().split('T')[0];
        this.modalAbierto = true;
        this.reservacionForm = this.formBuilder.group({
            adultos: ['', [Validators.required, Validators.min(1)]],
            ninos: ['', [Validators.required, Validators.min(0)]],
            noches: ['', [Validators.required, Validators.min(1)]],
            fecha: [null, Validators.required],
            edadesNinos: this.formBuilder.array([]),
            rangoFechas: [null]
        });

        this.reservacionForm.get('ninos')!.valueChanges.subscribe(cantidad => {
            console.log(cantidad);

            this.actualizarEdadesNinos(cantidad);
        });

        this.actualizarEdadesNinos(0);
    }

    actualizarEdadesNinos(cantidad: number) {
        while (this.edadesNinos.length !== 0) {
            this.edadesNinos.removeAt(0);
        }

        for (let i = 0; i < cantidad; i++) {
            this.edadesNinos.push(this.formBuilder.control(0, [Validators.required, Validators.min(0), Validators.max(18)]));
        }
    }

    cerrarModal() {
        this.modalAbierto = false;
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

    generarFechasDelMes() {
        const fecha = new Date();
        const year = fecha.getFullYear();
        const month = fecha.getMonth();

        const totalDias = new Date(year, month + 1, 0).getDate();
        for (let i = 1; i <= totalDias; i++) {
            this.fechasDelMes.push(new Date(year, month, i));
        }
    }

    seleccionarFecha(fecha: Date) {
        if (!this.fechaEntrada || (this.fechaEntrada && this.fechaSalida)) {
            this.fechaEntrada = fecha;
            this.fechaSalida = null;
        } else if (fecha > this.fechaEntrada) {
            this.fechaSalida = fecha;
        } else {
            this.fechaEntrada = fecha;
            this.fechaSalida = null;
        }
    }

    esFechaSeleccionada(fecha: Date): boolean {
        if (!this.fechaEntrada) return false;
        if (this.fechaEntrada && !this.fechaSalida) {
            return fecha.toDateString() === this.fechaEntrada.toDateString();
        }
        console.log(fecha >= this.fechaEntrada &&
            fecha <= this.fechaSalida);

        return (
            fecha >= this.fechaEntrada &&
            fecha <= this.fechaSalida
        );
    }

}
