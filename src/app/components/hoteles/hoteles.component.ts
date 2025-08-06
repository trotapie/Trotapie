import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, inject, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Hotel, IHoteles } from './hoteles.interface';
import { MaterialModule } from 'app/shared/material.module';
import { JsonpClientBackend, HttpClientJsonpModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { stringify } from 'crypto-js/enc-base64';
import { Observable } from 'rxjs';
import { DatosService } from './hoteles.service';
import { FuseSplashScreenService } from '@fuse/services/splash-screen';
import { TextTypewriterComponent } from 'app/text-typewriter.component';

@Component({
    selector: 'hoteles',
    templateUrl: './hoteles.component.html',
    imports: [MaterialModule, TextTypewriterComponent],
    encapsulation: ViewEncapsulation.None,
    standalone: true
})
export class HotelesComponent {
    private formBuilder = inject(FormBuilder);
    private router = inject(Router);
    private datosService = inject(DatosService);
    private splashScreen = inject(FuseSplashScreenService)

    /**
     * Constructor
     */

    hotelesForm: FormGroup;
    listaHoteles: IHoteles[];
    hotelesPorCiudad: Hotel[] = [];
    ciudadSeleccionada: boolean;
    cargando = false;
    hotel: Hotel;
    rating: Number;
    descuentoEstilos = ['descuento-rect', 'descuento-estrella', 'descuento-circulo'];
    @ViewChild('scrollContainer') scrollContainer!: ElementRef;
    @ViewChild('internacionalesSentinela') internacionalesSentinela!: ElementRef;
    @ViewChild('sentinelaInternacionales') sentinelaInternacionales!: ElementRef;
    internacionalesEnVista = false;
    tabIndexSeleccionado = 0;
    tabOffsets: number[] = [];
    tabWidths: number[] = [];
    constructor() {
    }

    ngOnInit() {
        this.splashScreen.show();
        this.listaHoteles = JSON.parse(sessionStorage.getItem('hoteles'));
        this.hotelesForm = this.formBuilder.group({
            hotelSeleccionado: ['Mazatlán']
        });


        this.hotel = JSON.parse(sessionStorage.getItem('hotel'))
        if (this.hotel !== null) {
            this.splashScreen.hide();
            sessionStorage.removeItem('hotel')
            const ciudad = sessionStorage.getItem('ciudad');
            if (ciudad) {
                const destino = this.listaHoteles.find(item => item.ciudad === ciudad);
                if (destino) {
                    this.hotelesForm.patchValue({ hotelSeleccionado: ciudad.trim() });
                    this.destinoSeleccionado(destino);
                }
            }
        } else {
            this.datosService.obtenerJson().subscribe({
                next: (data) => {
                    sessionStorage.setItem('hoteles', JSON.stringify(data))
                    const ciudad = sessionStorage.getItem('ciudad');
                    this.listaHoteles = data;
                    if (ciudad) {
                        const destino = this.listaHoteles.find(item => item.ciudad === ciudad);
                        if (destino) {
                            this.hotelesForm.patchValue({ hotelSeleccionado: ciudad.trim() });
                            this.destinoSeleccionado(destino);
                        }
                    }
                },
                error: (error) => {
                    console.error('Error al cargar JSON:', error);
                },
                complete: () => {
                    this.splashScreen.hide();
                }
            });
        }

        this.hotelesForm.get('hotelSeleccionado')?.valueChanges.subscribe(valor => {
            const destino = this.listaHoteles.find(item => item.ciudad.trim() === valor);
            this.destinoSeleccionado(destino);
        });
    }

    ngAfterViewInit(): void {
        const observer = new IntersectionObserver(
            ([entry]) => {
                this.internacionalesEnVista = entry.intersectionRatio > 0;
            },
            {
                root: null, // viewport
                threshold: 1.0 // solo cuando top del div está totalmente visible
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
            }, 100);
        }

        this.updateTabPosition();

    }

    destinoSeleccionado(event) {
        this.ciudadSeleccionada = true;
        this.hotelesPorCiudad = event.hoteles === undefined? [] : event.hoteles;
        sessionStorage.setItem('ciudad', event.ciudad)
    }

    verDetalleHotel(hotel: any): void {
        const scrollTop = this.scrollContainer.nativeElement.scrollTop;
        sessionStorage.setItem('scrollTopHoteles', scrollTop.toString());
        sessionStorage.setItem('hotel', JSON.stringify(hotel))
        this.router.navigate(['/hoteles/detalle-hotel', hotel.id], {
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
}
