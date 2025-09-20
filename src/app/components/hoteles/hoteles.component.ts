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
import { FloatingSearchComponent } from './search-component/floating-search.component';
import { SupabaseService } from 'app/core/supabase.service';

@Component({
    selector: 'hoteles',
    templateUrl: './hoteles.component.html',
    imports: [MaterialModule, FloatingSearchComponent],
    encapsulation: ViewEncapsulation.None,
    standalone: true
})
export class HotelesComponent {
    private formBuilder = inject(FormBuilder);
    private router = inject(Router);
    private datosService = inject(DatosService);
    private splashScreen = inject(FuseSplashScreenService)
    private supabase = inject(SupabaseService);

    /**
     * Constructor
     */

    hotelesForm: FormGroup;
    listaHoteles: IHoteles[];
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
    constructor() {
    }

    async ngOnInit() {
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
                const destino = this.listaHoteles.find(item => item.ciudad.trim() === ciudad.trim());
                if (destino) {
                    this.hotelesForm.patchValue({ hotelSeleccionado: ciudad.trim() });
                    setTimeout(() => {
                        this.destinoSeleccionado(destino);
                    }, 400);
                }
            }
        } else {
            this.datosService.obtenerJson().subscribe({
                next: (data) => {
                    sessionStorage.setItem('hoteles', JSON.stringify(data))
                    let ciudad = sessionStorage.getItem('ciudad');
                    this.listaHoteles = data;
                    this.listaHotelesFiltrada = data;
                    ciudad = ciudad === null ? 'Mazatlán' : ciudad;
                    if (ciudad) {
                        const destino = this.listaHotelesFiltrada.find(item => item.ciudad.trim() === ciudad.trim());
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
            sessionStorage.setItem('ciudad', valor)
            const destino = this.listaHotelesFiltrada.find(item => item.ciudad.trim() === valor);
            this.destinoSeleccionado(destino);
        });

        // const { data, error } = await this.supabase.listHotelesAll();
        // if (error) { this.error = error.message; return; }
        // console.log(data);


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

    destinoSeleccionado(event) {
        this.ciudadSeleccionada = true;
        if (event !== undefined) {
            this.hotelesPorCiudad = event.hoteles === undefined ? [] : event.hoteles;
            sessionStorage.setItem('ciudad', event.ciudad)
        } else {
            this.hotelesPorCiudad = []
        }

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

    onHotelesFiltrados(dataFiltrada: IHoteles[]) {
        this.listaHotelesFiltrada = dataFiltrada;
        let ciudad = sessionStorage.getItem('ciudad');
        ciudad = ciudad === null ? 'Mazatlán' : ciudad;

        if (ciudad) {
            const destino = this.listaHotelesFiltrada.find(item => item.ciudad.trim() === ciudad.trim());

            if (destino) {
                this.hotelesForm.patchValue({ hotelSeleccionado: ciudad.trim() });
                this.destinoSeleccionado(destino);
            } else {
                this.destinoSeleccionado(destino);

            }
        }

    }

    get currentYear(): number {
        return new Date().getFullYear();
    }

    irA(): void {
    const container = this.scrollContainer?.nativeElement;
    const target = this.ancla?.nativeElement;
    if (!container || !target) return;

    const targetY = this.getOffsetWithinContainer(target, container);
    const offset = this.getStickyOffset(container);

    container.scrollTo({
      top: Math.max(0, targetY - offset),
      behavior: 'smooth'
    });
  }

    irANacionales(): void {
    const container = this.scrollContainer?.nativeElement;
    const target = this.anclaNacionales?.nativeElement;
    if (!container || !target) return;

    const targetY = this.getOffsetWithinContainer(target, container);
    const offset = this.getStickyOffset(container);

    container.scrollTo({
      top: Math.max(0, targetY - offset),
      behavior: 'smooth'
    });
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
