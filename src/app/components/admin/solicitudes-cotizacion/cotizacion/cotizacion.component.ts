import { Component, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SupabaseService } from 'app/core/supabase.service';
import { MaterialModule } from 'app/shared/material.module';
import { Condicione, ICotizacion, IEstatusCotizacion, PreciosYCondiciones } from './cotizacion.interface';
import { DateI18nPipe } from 'app/core/i18n/date-i18n.pipe';
import { FormBuilder, Validators } from '@angular/forms';
import { map, Observable, startWith, subscribeOn } from 'rxjs';
import { MapaComponent } from 'app/components/hoteles/mapa/mapa.component';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { EstatusComponent } from 'app/shared/estatus/estatus.component';
import { CommonModule } from '@angular/common';
import { ImagenesCarruselComponent } from 'app/shared/imagenes-carrusel/imagenes-carrusel.component';

export interface PoliticaHotel {
  id: number;
  titulo: string;
  descripcion: string;
  tipoPoliticas?: string;
}

type Tile = { key: string; url: string; alt: string; class: string };


interface TipoHabitacion {
  id: number;
  nombre_habitacion: string;
  descripcion: string;
}
@Component({
  selector: 'app-modificar-cotizacion',
  imports: [MaterialModule, RouterLink, DateI18nPipe, MapaComponent, TranslocoModule, EstatusComponent, CommonModule, ImagenesCarruselComponent],
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
  private _translocoService = inject(TranslocoService);
  cargando = true;

  informacionCotizacion: ICotizacion
  esEdicion: boolean;
  enviarCotizacion: boolean;
  mostrarMapa = false;
  estatusOpciones: IEstatusCotizacion[] = []
  preciosList: string[] = [];
  politicas: PoliticaHotel[] = []
  politicasApartado: PoliticaHotel[] = [
    {
      "id": 1,
      "titulo": "Apartado con anticipo",
      "descripcion": "Se permite apartar la tarifa mediante un anticipo, el monto restante deberá liquidarse para confirmar la reserva."
    },
    {
      "id": 2,
      "titulo": "Pago del anticipo",
      "descripcion": "El anticipo para apartar la reserva deberá pagarse en una sola exhibición."
    },
    {
      "id": 3,
      "titulo": "Condición del anticipo",
      "descripcion": "El anticipo no es reembolsable; sin embargo, puede aplicarse como saldo a favor para futuras reservas, servicios o productos con la agencia."
    },
    {
      "id": 4,
      "titulo": "Métodos de pago",
      "descripcion": "Pague después: Aceptamos todos los métodos de pago (Efectivo y Transferencias SPEI)."
    },
    {
      "id": 5,
      "titulo": "Promoción a meses",
      "descripcion": "Pague después: Promoción a meses sin intereses (Aplica restricciones)."
    },
    {
      "id": 6,
      "titulo": "3 meses sin intereses",
      "descripcion": "3 Meses sin intereses: BBVA México, Banamex, BradesCard México."
    },
    {
      "id": 7,
      "titulo": "6 meses sin intereses",
      "descripcion": "6 Meses sin intereses: Afirme, American Express, Banamex, Banorte, BBVA México, Banca Mifel, BanBajio, Banregio, Banjercito, Banco Azteca, Falabella, HSBC, Inbursa, Invex, Liverpool VISA, Santander, Scotiabank, Suburbia."
    },
    {
      "id": 8,
      "titulo": "Cancelación posterior al pago total",
      "descripcion": "Al liquidar el pago total, la reserva contara con cancelación sin costo dentro de las 72 horas posteriores."
    }
  ];
  politicasNoReembolsable: PoliticaHotel[] = [
    {
      "id": 1,
      "titulo": "Confirmación de reserva",
      "descripcion": "La reserva se confirma únicamente con pago total."
    },
    {
      "id": 2,
      "titulo": "Cancelaciones y cambios",
      "descripcion": "No se puede cancelar ni realizar cambios."
    },
    {
      "id": 3,
      "titulo": "Métodos de pago",
      "descripcion": "Aceptamos todos los métodos de pago."
    }
  ];

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
    precio: [null],
    precioConSeguro: [null],
    precioMeses: [null],
    tipoHabitacion: [null as TipoHabitacion, [Validators.required]],
    estatus: ['', [Validators.required]],
    condicionesPrecioSinSeguro: this.fb.control<Condicione[]>([]),
    condicionesPrecioConSeguro: this.fb.control<Condicione[]>([]),
    condicionesPrecioMeses: this.fb.control<Condicione[]>([]),
    porcentajeSeguro: [null],
    porcentajeMeses: [null],
    tipoTarifa: ['']
  });

  tiposHabitacion: TipoHabitacion[] = [];
  filteredOptions$: TipoHabitacion[] = [];

  precioSinSeguro: PreciosYCondiciones;
  precioConSeguro: PreciosYCondiciones;
  precioAMeses: PreciosYCondiciones;

  comparePolitica = (a: any, b: any) => a?.id === b?.id;

  async ngOnInit() {
    try {
      this.cargando = true;
      const url = this.router.url;
      const id = this.route.snapshot.paramMap.get('id');
      // this.informacionCotizacion = await this.supabase.obtenerCotizacionPorPublicId(id);
      this.esEdicion = url.includes('edicion-cotizacion') ? true : false
      let datosHotel = {}


      if (this.esEdicion) {
        this.obtenerInformacionCatalogosEdicion()
        this.informacionCotizacion = await this.supabase.obtenerCotizacionPorPublicId(id);
        datosHotel = {
          ubicacion: this.informacionCotizacion.ubicacion,
          nombre_hotel: this.informacionCotizacion.nombre_hotel
        }
        this.setActiveLang('es')
        const info = this.informacionCotizacion.precios.find(item => item.tipo === 'a_meses')
        this.edicionForm.patchValue({
          tipoTarifa: info.condiciones[0].tipoPoliticas
        })
        this.politicas = info.condiciones[0].tipoPoliticas === 'apartado' ? this.politicasApartado : this.politicasNoReembolsable;
      } else {
        this.informacionCotizacion = await this.supabase.obtenerCotizacionPorPublicIdCliente(id);
        datosHotel = {
          ubicacion: this.informacionCotizacion.ubicacion,
          nombre_hotel: this.informacionCotizacion.nombre_hotel
        }
        this.validacionesPreciosGuardados();
        this.setActiveLang(this.informacionCotizacion.idioma)
      }

      sessionStorage.setItem('hotel', JSON.stringify(datosHotel))
    } finally {
      this.cargando = false;
      this.edicionForm.get('tipoHabitacion')?.valueChanges.subscribe(valor => {

        const texto = typeof valor === 'string' ? valor : valor.nombre_habitacion || '';
        this.filteredOptions$ = this.tiposHabitacion.filter(m =>
          m.nombre_habitacion.toUpperCase().includes(texto.toUpperCase())
        );
      });

      this.edicionForm.get('tipoTarifa')?.valueChanges.subscribe(valor => {
        this.edicionForm.patchValue({
          condicionesPrecioMeses: []
        })
        this.politicas = valor === 'apartado' ? this.politicasApartado : this.politicasNoReembolsable;
        this.politicas.forEach(item => {
          item.tipoPoliticas = valor;
        })
      });

      this.edicionForm?.valueChanges.subscribe(valor => {
        const precios = []
        if (valor.precio) precios.push(valor.precio);
        if (valor.precioConSeguro) precios.push(valor.precioConSeguro);
        if (valor.precioMeses) precios.push(valor.precioMeses);
        this.preciosList = precios;

      })
    }
  }

  async obtenerInformacionCatalogosEdicion() {
    const { data } = await this.supabase.tipoHabitaciones();
    const estatus = await this.supabase.estatusCotizaciones();
    this.estatusOpciones = estatus.data

    this.filteredOptions$ = this.tiposHabitacion = data;
    this.validacionesPreciosGuardados()

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
    this.supabase.actualizarCotizacionPublicaCompleta(this.informacionCotizacion.public_id, this.edicionForm.value);
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

Me da mucho gusto compartirle la cotización de su viaje. Preparé esta propuesta considerando lo que me comentó para que sea una excelente experiencia.

Puede revisarla aquí: 
${url}

Si todo está en orden, con gusto puedo apoyarle a asegurar disponibilidad y tarifa cuanto antes.
¿Le gustaría que avancemos con la reserva?

Quedamos a sus ordenes.
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

  setActiveLang(lang: string): void {
    // Set the active lang
    this._translocoService.setActiveLang(lang);
    localStorage.setItem('lang', lang);
  }

  estatusLabelPrimerSeleccionado(campoForm: string, datos: PoliticaHotel[] = []): string {
    const selected: any[] = this.edicionForm.get(campoForm)?.value ?? [];
    if (!selected.length) return 'Selecciona condicion';
    const first = datos.find(e => e.id === selected[0].id);
    return first?.descripcion ?? 'Selecciona condicion';
  }

  validacionesPreciosGuardados() {
    const { precios } = this.informacionCotizacion;
    this.precioSinSeguro = precios.find(o => o.tipo === 'sin_seguro') ?? null;
    this.precioConSeguro = precios.find(o => o.tipo === 'con_seguro') ?? null;
    this.precioAMeses = precios.find(o => o.tipo === 'a_meses') ?? null;

    if (this.esEdicion) {
      this.edicionForm.patchValue({
        precio: this.precioSinSeguro ? this.precioSinSeguro.precio : null,
        precioConSeguro: this.precioConSeguro ? this.precioConSeguro.precio : null,
        precioMeses: this.precioAMeses ? this.precioAMeses.precio : null,
        tipoHabitacion: this.tiposHabitacion.find(
          item => item.id === this.informacionCotizacion.tipo_habitacion
        ),
        estatus: this.estatusOpciones.find(
          item => item.nombre === this.informacionCotizacion.estatus
        )?.clave ?? '',
        condicionesPrecioSinSeguro: this.precioSinSeguro ? this.precioSinSeguro.condiciones : [],
        condicionesPrecioConSeguro: this.precioConSeguro ? this.precioConSeguro.condiciones : [],
        condicionesPrecioMeses: this.precioAMeses ? this.precioAMeses.condiciones : [],
      });
    }
  }


  contactarAgente(tipo: 'sin_seguro' | 'con_seguro' | 'a_meses', total: string, link: string) {
    const label: Record<string, string> = {
      sin_seguro: 'sin seguro',
      con_seguro: 'con seguro',
      a_meses: 'a meses',
    };
    const url = `https://app.trotapie.com/cotizacion/${this.informacionCotizacion.public_id}`

    let mensaje = `Hola 

Estoy interesado(a) en esta cotización:
${url}
`;

    if (tipo) {
      mensaje += `
Me gustó la opción ${label[tipo]} y me gustaría avanzar con la reserva.
¿Me ayudas con los siguientes pasos?`;
    } else {
      mensaje += `
Me gustaría avanzar con la reserva.
¿Me ayudas con los siguientes pasos?`;
    }

    window.open(`https://wa.me/526188032003?text=${encodeURIComponent(mensaje)}`, '_blank');
  }




}
