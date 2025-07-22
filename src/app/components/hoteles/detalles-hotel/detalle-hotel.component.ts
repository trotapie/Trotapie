import { HttpClient } from '@angular/common/http';
import { Component, inject, ViewEncapsulation } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
    imagenes: string[] = [];
    scrolled = false;
    modalAbierto = false;
    reservacionForm: FormGroup;
    hoy: string;

    get edadesNinos() {
        return this.reservacionForm.get('edadesNinos') as FormArray;
    }

    constructor() {
        const nav = this.router.getCurrentNavigation();
        this.hotel = nav?.extras.state?.hotel;
        const partes = this.hotel.descripcion.split('\n');
        this.descripcionParrafo = partes[0];
        this.descripcionLista = partes.slice(1);
        this.cargarImagenesConDelay();
    }

    ngOnInit() {
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

        const edadesTexto = edadesNinos.map((edad: number, index: number) => `Niño ${index + 1}: ${edad} años`).join(', ');

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
            adultos: [1, [Validators.required, Validators.min(1)]],
            ninos: [0, [Validators.required, Validators.min(0)]],
            noches: [1, [Validators.required, Validators.min(1)]],
            fecha: [null, Validators.required],
            edadesNinos: this.formBuilder.array([])
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



}
