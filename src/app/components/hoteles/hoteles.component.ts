import { HttpClient } from '@angular/common/http';
import { Component, inject, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HOTELES_DATA } from 'assets/data/hoteles';
import { Hotel, IHoteles } from './hoteles.interface';
import { MaterialModule } from 'app/shared/material.module';
import { JsonpClientBackend, HttpClientJsonpModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { stringify } from 'crypto-js/enc-base64';
import { Observable } from 'rxjs';
import { DatosService } from './hoteles.service';
import { FuseSplashScreenService } from '@fuse/services/splash-screen';

@Component({
    selector: 'hoteles',
    standalone: true,
    templateUrl: './hoteles.component.html',
    imports: [MaterialModule],
    encapsulation: ViewEncapsulation.None,
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

    rating = 0.5;
    constructor() {
    }

    ngOnInit() {
        this.splashScreen.show();
        this.listaHoteles = JSON.parse(sessionStorage.getItem('hoteles'));
        this.hotelesForm = this.formBuilder.group({
            hotelSeleccionado: ['']
        });
        if (this.listaHoteles !== null) {
            this.splashScreen.hide();
            const ciudad = sessionStorage.getItem('ciudad');
            if (ciudad) {
                const destino = this.listaHoteles.find(item => item.ciudad === ciudad);
                if (destino) {
                    this.hotelesForm.patchValue({ hotelSeleccionado: ciudad });
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
                            this.hotelesForm.patchValue({ hotelSeleccionado: ciudad });
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
    }

    destinoSeleccionado(event) {
        this.ciudadSeleccionada = true;
        this.hotelesPorCiudad = event.hoteles;
        sessionStorage.setItem('ciudad', event.ciudad)
    }

    verDetalleHotel(hotel: any): void {
        sessionStorage.setItem('hotel', JSON.stringify(hotel))
        this.router.navigate(['/hoteles/detalle-hotel', hotel.id], {
            state: { hotel }
        });
    }

    getFullStars(rating: number): any[] {
        return Array(Math.floor(rating));
    }

    hasHalfStar(rating: number): boolean {
        const decimal = rating % 1;
        return decimal >= 0.25 && decimal < 0.75;
    }

    getEmptyStars(rating: number): any[] {
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
}
