import { HttpClient } from '@angular/common/http';
import { Component, inject, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HOTELES_DATA } from 'assets/data/hoteles';
import { MaterialModule } from 'app/shared/material.module';
import { JsonpClientBackend, HttpClientJsonpModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { Hotel, IHoteles } from '../hoteles.interface';

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

    hotel: Hotel;
    descripcionParrafo: string = '';
    descripcionLista: string[] = [];

    constructor() {
        const nav = this.router.getCurrentNavigation();
        this.hotel = nav?.extras.state?.hotel;
        // const partes = this.hotel.descripcion.split('\n');
        // this.descripcionParrafo = partes[0];
        // this.descripcionLista = partes.slice(1);
        console.log(this.hotel);

    }

    ngOnInit() {
        this.hotel = JSON.parse(sessionStorage.getItem('hotel'))
        console.log(this.hotel.descripcion);
        const partes = this.hotel.descripcion.split('\n');
        this.descripcionParrafo = partes[0];
        this.descripcionLista = partes.slice(1);
    }

    regresar(){
        window.history.back();
    }

}
