import { Component, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SupabaseService } from 'app/core/supabase.service';
import { MaterialModule } from 'app/shared/material.module';
import { ICotizacion, IEstatusCotizacion } from './cotizacion.interface';
import { DateI18nPipe } from 'app/core/i18n/date-i18n.pipe';
import { FormBuilder, Validators } from '@angular/forms';
import { map, Observable, startWith } from 'rxjs';
import { MapaComponent } from 'app/components/hoteles/mapa/mapa.component';

type Tile = { key: string; url: string; alt: string; class: string };

interface TipoHabitacion {
  id: number;
  nombre_habitacion: string;
  descripcion: string;
}
@Component({
  selector: 'app-modificar-cotizacion',
  imports: [MaterialModule, RouterLink, DateI18nPipe, MapaComponent],
  templateUrl: './cotizacion.component.html',
  styleUrl: './cotizacion.component.scss',
  standalone: true
})

export class CotizacionComponent implements OnInit {
  private router = inject(Router)
  private title = inject(Title);
  private meta = inject(Meta);
  private route = inject(ActivatedRoute)
  private supabase = inject(SupabaseService);
  private fb = inject(FormBuilder);
  cargando = true;

  informacionCotizacion: ICotizacion
  esEdicion: boolean;
  enviarCotizacion: boolean;
  mostrarMapa = false;
  estatusOpciones: IEstatusCotizacion[] = []

  telefonoForm = this.fb.group({
    telefono: [
      '',
      [
        Validators.required,
        Validators.minLength(7),
        Validators.maxLength(10),
        Validators.pattern(/^[0-9]+$/) // solo números
      ]
    ]
  });

  edicionForm = this.fb.group({
    precio: [null, [Validators.required]],
    tipoHabitacion: [null as TipoHabitacion, [Validators.required]],
    estatus: ['', [Validators.required]]
  });

  tiposHabitacion: TipoHabitacion[] = [];
  filteredOptions$: TipoHabitacion[] = [];

  async ngOnInit() {
    try {
      this.cargando = true;
      const url = this.router.url;
      const id = this.route.snapshot.paramMap.get('id');
      this.informacionCotizacion = await this.supabase.obtenerCotizacionPorPublicId(id);
      this.esEdicion = url.includes('edicion-cotizacion') ? true : false

      if (this.esEdicion) {
        this.obtenerInformacionCatalogosEdicion()
      }

      this.title.setTitle('Reserva tu viaje a Cancún - Cotización | Trotapie');

      this.meta.updateTag({
        name: 'description',
        content: 'Cotiza tu viaje a Cancún con los mejores hoteles en Trotapie.'
      });

      this.meta.updateTag({
        property: 'og:title',
        content: 'Reserva tu viaje a Cancún - Cotización'
      });

      this.meta.updateTag({
        property: 'og:description',
        content: 'Cotiza hoteles en Cancún fácil y rápido con Trotapie.'
      });

      this.meta.updateTag({
        property: 'og:image',
        content: 'https://app.trotapie.com/assets/images/og/cancun-cotizacion.jpg'
      });

      this.meta.updateTag({
        property: 'og:url',
        content: window.location.href
      });
    } finally {
      this.cargando = false;
      this.edicionForm.get('tipoHabitacion')?.valueChanges.subscribe(valor => {

        const texto = typeof valor === 'string' ? valor : valor.nombre_habitacion || '';
        this.filteredOptions$ = this.tiposHabitacion.filter(m =>
          m.nombre_habitacion.toUpperCase().includes(texto.toUpperCase())
        );
      });
    }
  }

  async obtenerInformacionCatalogosEdicion() {
    const { data } = await this.supabase.tipoHabitaciones();
    const estatus = await this.supabase.estatusCotizaciones();
    this.estatusOpciones = estatus.data

    this.filteredOptions$ = this.tiposHabitacion = data;
    const datosHotel = {
      ubicacion: this.informacionCotizacion.ubicacion

    }
    sessionStorage.setItem('hotel', JSON.stringify(datosHotel))

    this.edicionForm.patchValue({
      precio: this.informacionCotizacion.precio_cotizacion,
      tipoHabitacion: this.tiposHabitacion.find(
        item => item.id === this.informacionCotizacion.tipo_habitacion
      ),
      estatus: this.estatusOpciones.find(
        item => item.nombre === this.informacionCotizacion.estatus
      )?.clave ?? ''
    });
  }

  private _filter(value: string): TipoHabitacion[] {
    const filterValue = value.toLowerCase().trim();
    return this.tiposHabitacion.filter(option =>
      option.nombre_habitacion.toLowerCase().includes(filterValue)
    );
  }

  displayHabitacion = (option: TipoHabitacion | null): string =>
    option ? option.nombre_habitacion : '';

  get fotos(): string[] {
    return (this.informacionCotizacion?.imagenes ?? [])
      .map(x => x?.url)
      .filter((u): u is string => !!u)
      .slice(0, 8);
  }

  fotoUrl(i: number): string {
    return this.fotos[i] ?? this.informacionCotizacion?.fondo ?? '';
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

  modalCotizacion() {
    this.enviarCotizacion = true;
    const { precio, tipoHabitacion, estatus } = this.edicionForm.value
    this.supabase.actualizarPrecioHabitacionYEstatus(this.informacionCotizacion.public_id, precio, tipoHabitacion.id, estatus)
  }

  get telefonoCtrl() {
    return this.telefonoForm.get('telefono');
  }

  get telefonoInvalido(): boolean {
    const ctrl = this.telefonoCtrl;
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  get precioCtrl() {
    return this.edicionForm.get('precio');
  }

  get precioInvalido(): boolean {
    const ctrl = this.precioCtrl;
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  soloNumeros(event: Event) {
    const input = event.target as HTMLInputElement;
    const limpio = input.value.replace(/\D/g, '');
    this.telefonoCtrl?.setValue(limpio, { emitEvent: false });
  }

  sendCotizacion() {
    const telefonoLimpio = this.telefonoForm.get('telefono').value.replace(/\D/g, '');
    const url = `https://app.trotapie.com/cotizacion/${this.informacionCotizacion.public_id}`
    const mensaje = `
Buen día,

Le comparto la cotización solicitada para su viaje.
Puede consultarla en el siguiente enlace:

${url}

Quedo atento(a) a cualquier comentario o ajuste que requiera.
  `.trim();

    const mensajeCodificado = encodeURIComponent(mensaje);
    // TODO: HACER EL CAMBIO DEL 52 Y VER EL DE LOS DEMAS PAISES
    const whatsappUrl = `https://wa.me/52${telefonoLimpio}?text=${mensajeCodificado}`;

    window.open(whatsappUrl, '_blank');
    this.enviarCotizacion = false;
  }

  abrirUbicacion() {
    this.mostrarMapa = !this.mostrarMapa;
  }


}
