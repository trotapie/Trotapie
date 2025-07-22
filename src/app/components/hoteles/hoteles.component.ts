import { HttpClient } from '@angular/common/http';
import { Component, inject, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HOTELES_DATA } from 'assets/data/hoteles';
import { Hotel, IHoteles } from './hoteles.interface';
import { MaterialModule } from 'app/shared/material.module';
import { JsonpClientBackend, HttpClientJsonpModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { stringify } from 'crypto-js/enc-base64';

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

    /**
     * Constructor
     */

    hotelesForm: FormGroup;
    listaHoteles: IHoteles[];
    hotelesPorCiudad: Hotel[] = [];
    ciudadSeleccionada: boolean;
    constructor(private http: HttpClient) {
    }

    ngOnInit() {
        //TODO: Hacer que funcione la consulta
        // this.http.jsonp('https://script.google.com/macros/s/AKfycbyhBAdrLnNLcvH93749J9OQMEMQlhlqCSTz9qcOZJ-DV48FFCmml8GSqFZOxYGBXEH7Ag/exec', 'callback')
        //     .subscribe({
        //         next: data => console.log('Datos:', data),
        //         error: err => console.error('Error JSONP:', err)
        //     });

        const ciudad = sessionStorage.getItem('ciudad');     
        this.listaHoteles = HOTELES_DATA;
        this.hotelesForm = this.formBuilder.group({
            hotelSeleccionado: ['']
        });

        if (ciudad) {
        const destino = this.listaHoteles.find(item => item.ciudad === ciudad);
        if (destino) {
            this.hotelesForm.patchValue({ hotelSeleccionado: ciudad });
            this.destinoSeleccionado(destino);
        }
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
}
