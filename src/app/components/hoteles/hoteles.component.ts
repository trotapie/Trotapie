import { HttpClient } from '@angular/common/http';
import { Component, inject, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HOTELES_DATA } from 'assets/data/hoteles';
import { IHoteles } from './hoteles.interface';
import { MaterialModule } from 'app/shared/material.module';
import { JsonpClientBackend, HttpClientJsonpModule } from '@angular/common/http';

@Component({
    selector: 'hoteles',
    standalone: true,
    templateUrl: './hoteles.component.html',
    imports: [MaterialModule],
    encapsulation: ViewEncapsulation.None,
})
export class HotelesComponent {
    private formBuilder = inject(FormBuilder);

    /**
     * Constructor
     */

    hotelesForm: FormGroup;
    listaHoteles: IHoteles[];
    hotelesPorCiudad: any;
    constructor(private http: HttpClient) {
    }

    ngOnInit() {
        //TODO: Hacer que funcione la consulta
        // this.http.jsonp('https://script.google.com/macros/s/AKfycbyhBAdrLnNLcvH93749J9OQMEMQlhlqCSTz9qcOZJ-DV48FFCmml8GSqFZOxYGBXEH7Ag/exec', 'callback')
        //     .subscribe({
        //         next: data => console.log('Datos:', data),
        //         error: err => console.error('Error JSONP:', err)
        //     });


        console.log(HOTELES_DATA);
        this.listaHoteles = HOTELES_DATA;
        this.hotelesForm = this.formBuilder.group({
            hotelSeleccionado: ['']
        });
    }

    destinoSeleccionado(event) {
        console.log(event);
        this.hotelesPorCiudad = event.hoteles;
        console.log(this.hotelesPorCiudad);

    }

verDetalleHotel(hotel: any): void {
    console.log(hotel);
    
//   this.router.navigate(['/detalle-hotel', hotel.id], {
//     state: { hotel } // <-- Aquí mandas toda la info
//   });
}
}
