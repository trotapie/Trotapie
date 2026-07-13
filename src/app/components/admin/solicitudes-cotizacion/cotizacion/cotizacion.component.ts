import { Component, HostListener, inject, OnInit, ViewChild } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogosAdminService } from 'app/core/catalogos-admin.service';
import { CotizacionesService } from 'app/core/cotizaciones.service';
import { MaterialModule } from 'app/shared/material.module';
import { Condicione, CotizacionMultipleItem, ICotizacion, IEstatusCotizacion, PoliticaHotel, PreciosYCondiciones } from './cotizacion.interface';
import { DateI18nPipe } from 'app/core/i18n/date-i18n.pipe';
import { AbstractControl, FormArray, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { firstValueFrom, map, Observable, startWith, subscribeOn } from 'rxjs';
import { MapaComponent } from 'app/components/hoteles/mapa/mapa.component';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { EstatusComponent } from 'app/shared/estatus/estatus.component';
import { CommonModule } from '@angular/common';
import { ImagenesCarruselComponent } from 'app/shared/imagenes-carrusel/imagenes-carrusel.component';
import { find } from 'lodash';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { formatearFolioCotizacion } from 'app/core/cotizacion-folio.util';

type Tile = { key: string; url: string; alt: string; class: string };

function validarListaCorreos(control: AbstractControl): ValidationErrors | null {
  const valor = String(control.value ?? '').trim();
  if (!valor) return null;

  const correos = valor
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!correos.length) return null;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const todosValidos = correos.every((correo) => emailRegex.test(correo));

  return todosValidos ? null : { emailList: true };
}


interface TipoHabitacion {
  id: number;
  nombre_habitacion: string;
  descripcion: string;
  capacidad_maxima?: number | null;
}

interface CotizacionHabitacionForm {
  tipoHabitacion: TipoHabitacion | null;
  hotelId?: number | null;
  hotelNombre?: string | null;
  regimenId?: number | null;
  regimen?: string | null;
  origenReservacionPrecio: number | null;
  origenReservacionConSeguro: number | null;
  origenReservacionMeses: number | null;
  precio: number | string | null;
  precioConSeguro: number | string | null;
  precioMeses: number | string | null;
  condicionesPrecioSinSeguro: Condicione[];
  condicionesPrecioConSeguro: Condicione[];
  condicionesPrecioMeses: Condicione[];
  porcentajeSeguro: number | string | null;
  porcentajeMeses: number | string | null;
  fechaLimiteSeguro: Date | string | null;
  fechaLimiteMeses: Date | string | null;
  tipoTarifa: string | null;
}

interface HabitacionCotizacionPublicaVista {
  indice: number;
  tipoHabitacion: string | null;
  hotelNombre?: string | null;
  detalleHabitacion: string | null;
  precioSinSeguro: number | null;
  precioConSeguro: number | null;
  precioMeses: number | null;
  porcentajeSeguro: number | null;
  porcentajeMeses: number | null;
  fechaLimiteSeguro: string | null;
  fechaLimiteMeses: string | null;
  tipoTarifaMeses: string | null;
  condicionesSinSeguro: Condicione[];
  condicionesConSeguro: Condicione[];
  condicionesMeses: Condicione[];
  apartadoSeguro: number | null;
  pagueDespuesSeguro: number | null;
  apartadoMeses: number | null;
  pagueDespuesMeses: number | null;
  origenReservacionPrecio: number | null;
  origenReservacionConSeguro: number | null;
  origenReservacionMeses: number | null;
}

interface DetalleHabitacionCotizacion {
  indice: number;
  habitacion: string;
  adultos: number;
  ninos: number;
  extra?: string;
}

type TarifaPublica = 'sin_seguro' | 'con_seguro' | 'a_meses';

interface CountryDialCode {
  country: string;
  iso2: string;
  dialCode: string;
}

interface OrigenReservacionOption {
  id: number;
  clave: string;
  nombre_cotizador: string;
  estatus: boolean;
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
  private supabase = inject(CotizacionesService);
  private catalogosAdmin = inject(CatalogosAdminService);
  private fb = inject(FormBuilder);
  private _translocoService = inject(TranslocoService);
  private sanitizer = inject(DomSanitizer);
  cargando = true;

  informacionCotizacion: ICotizacion
  @ViewChild(ImagenesCarruselComponent) galeriaHotel?: ImagenesCarruselComponent;
  esEdicion: boolean;
  exportandoPdf = false;
  enviarCotizacion: boolean;
  mostrarMapa = false;
  estatusOpciones: IEstatusCotizacion[] = []
  preciosList: string[] = [];
  politicas: PoliticaHotel[] = []
  politicasApartado: PoliticaHotel[] = [];
  politicasNoReembolsable: PoliticaHotel[] = [];
  politicasApartadoMeses: PoliticaHotel[] = [];
  politicasNoReembolsableMeses: PoliticaHotel[] = [];
  campoPrecioActivo: 'precio' | 'precioConSeguro' | 'precioMeses' = 'precio';
  readonly defaultDialCode = '52';
  readonly countryDialCodes: CountryDialCode[] = [
    { country: 'Argentina', iso2: 'AR', dialCode: '54' },
    { country: 'Australia', iso2: 'AU', dialCode: '61' },
    { country: 'Austria', iso2: 'AT', dialCode: '43' },
    { country: 'Belgium', iso2: 'BE', dialCode: '32' },
    { country: 'Bolivia', iso2: 'BO', dialCode: '591' },
    { country: 'Brazil', iso2: 'BR', dialCode: '55' },
    { country: 'Bulgaria', iso2: 'BG', dialCode: '359' },
    { country: 'Canada', iso2: 'CA', dialCode: '1' },
    { country: 'Chile', iso2: 'CL', dialCode: '56' },
    { country: 'China', iso2: 'CN', dialCode: '86' },
    { country: 'Colombia', iso2: 'CO', dialCode: '57' },
    { country: 'Costa Rica', iso2: 'CR', dialCode: '506' },
    { country: 'Cuba', iso2: 'CU', dialCode: '53' },
    { country: 'Dominican Republic', iso2: 'DO', dialCode: '1' },
    { country: 'Ecuador', iso2: 'EC', dialCode: '593' },
    { country: 'El Salvador', iso2: 'SV', dialCode: '503' },
    { country: 'France', iso2: 'FR', dialCode: '33' },
    { country: 'Germany', iso2: 'DE', dialCode: '49' },
    { country: 'Guatemala', iso2: 'GT', dialCode: '502' },
    { country: 'Honduras', iso2: 'HN', dialCode: '504' },
    { country: 'India', iso2: 'IN', dialCode: '91' },
    { country: 'Ireland', iso2: 'IE', dialCode: '353' },
    { country: 'Italy', iso2: 'IT', dialCode: '39' },
    { country: 'Japan', iso2: 'JP', dialCode: '81' },
    { country: 'Mexico', iso2: 'MX', dialCode: '52' },
    { country: 'Netherlands', iso2: 'NL', dialCode: '31' },
    { country: 'Nicaragua', iso2: 'NI', dialCode: '505' },
    { country: 'Norway', iso2: 'NO', dialCode: '47' },
    { country: 'Panama', iso2: 'PA', dialCode: '507' },
    { country: 'Paraguay', iso2: 'PY', dialCode: '595' },
    { country: 'Peru', iso2: 'PE', dialCode: '51' },
    { country: 'Portugal', iso2: 'PT', dialCode: '351' },
    { country: 'Puerto Rico', iso2: 'PR', dialCode: '1' },
    { country: 'South Korea', iso2: 'KR', dialCode: '82' },
    { country: 'Spain', iso2: 'ES', dialCode: '34' },
    { country: 'Switzerland', iso2: 'CH', dialCode: '41' },
    { country: 'Thailand', iso2: 'TH', dialCode: '66' },
    { country: 'Turkey', iso2: 'TR', dialCode: '90' },
    { country: 'United Arab Emirates', iso2: 'AE', dialCode: '971' },
    { country: 'United Kingdom', iso2: 'GB', dialCode: '44' },
    { country: 'United States', iso2: 'US', dialCode: '1' },
    { country: 'Uruguay', iso2: 'UY', dialCode: '598' },
    { country: 'Venezuela', iso2: 'VE', dialCode: '58' }
  ];

  @HostListener('document:click', ['$event'])
  cerrarDetallesAlTocarFuera(event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('.quote-payment-popover')) return;

    document.querySelectorAll<HTMLDetailsElement>('.quote-payment-popover[open]').forEach((detalle) => {
      detalle.open = false;
    });
  }

  cerrarOtrosDetalles(event: Event): void {
    const detalleActual = event.target as HTMLDetailsElement;
    if (!detalleActual.open) return;

    document.querySelectorAll<HTMLDetailsElement>('.quote-payment-popover[open]').forEach((detalle) => {
      if (detalle !== detalleActual) detalle.open = false;
    });
  }

  telefonoForm = this.fb.group({
    lada: [this.defaultDialCode, [Validators.required]],
    telefono: [
      '',
      [
        Validators.minLength(6),
        Validators.maxLength(15),
        Validators.pattern(/^[0-9]+$/) // solo numeros
      ]
    ],
    correo: ['', [validarListaCorreos]],
    asunto: [''],
    descripcionCorreo: ['Te compartimos los detalles de tu solicitud de cotización.']
  });
  enviandoCorreoCotizacion = false;
  mensajeCorreoCotizacion = '';

  edicionForm = this.fb.group({
    hotelId: [null as number | null],
    hotelNombre: [''],
    regimenId: [null as number | null],
    regimen: [''],
    origenReservacionPrecio: [null as number | null],
    origenReservacionConSeguro: [null as number | null],
    origenReservacionMeses: [null as number | null],
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
    fechaLimiteSeguro: [null],
    fechaLimiteMeses: [null],
    tipoTarifa: [''],
    pagueDespuesApartado: [null],
    cantidadApartado: [null],
    pagueDespuesMeses: [null],
    cantidadMeses: [null],
    habitacionesAdicionales: this.fb.array([])
  });

  tiposHabitacion: TipoHabitacion[] = [];
  origenReservacionOpciones: OrigenReservacionOption[] = [];
  filteredOptions$: TipoHabitacion[] = [];

  precioSinSeguro: PreciosYCondiciones;
  precioConSeguro: PreciosYCondiciones;
  precioAMeses: PreciosYCondiciones;

  comparePolitica = (a: any, b: any) => a?.id === b?.id;
  compareTipoHabitacion = (a: TipoHabitacion | null, b: TipoHabitacion | null) => a?.id === b?.id;
  habitacionesPanelAbierto: boolean[] = [true];
  private habitacionesPanelCompletasPrevias: boolean[] = [false];

  get habitacionesAdicionales(): FormArray {
    return this.edicionForm.get('habitacionesAdicionales') as FormArray;
  }

  get tieneMultiplesHabitacionesPublicas(): boolean {
    return !this.esEdicion && this.cotizacionMultipleRespuesta.length > 0;
  }

  get habitacionesAlojamientoVista(): Array<{ indice: number; tipoHabitacion: string | null }> {
    if (this.esEdicion) {
      return [{ indice: 1, tipoHabitacion: null }];
    }

    const multiples = this.cotizacionMultipleRespuesta;
    if (multiples.length) {
      return multiples.map((item, idx) => ({
        indice: idx + 1,
        tipoHabitacion: this.obtenerNombreTipoHabitacion(item?.tipo_habitacion_id)
      }));
    }

    const totalHabitaciones = this.obtenerTotalHabitacionesVistaPublica();
    const tipoPrincipal =
      this.obtenerNombreTipoHabitacion(this.informacionCotizacion?.tipo_habitacion as number | null) ??
      null;

    return Array.from({ length: totalHabitaciones }, (_, idx) => ({
      indice: idx + 1,
      tipoHabitacion: tipoPrincipal
    }));
  }

  get habitacionesCotizacionPublicaVista(): HabitacionCotizacionPublicaVista[] {
    if (this.esEdicion) return [];

    return this.construirHabitacionesCotizacionVista();
  }

  private construirHabitacionesCotizacionVista(): HabitacionCotizacionPublicaVista[] {
    const porcentajeSeguroGlobal =
      this.obtenerNumeroLimpio(this.precioConSeguro?.porcentaje) ??
      this.obtenerNumeroLimpio(this.informacionCotizacion?.porcentaje_seguro);
    const porcentajeMesesGlobal =
      this.obtenerNumeroLimpio(this.precioAMeses?.porcentaje) ??
      this.obtenerNumeroLimpio(this.informacionCotizacion?.porcentaje_meses);
    const detalleHabitaciones = this.obtenerDetalleHabitacionesPdf(this.obtenerTextoHabitacionesCotizacion());

    return this.cotizacionMultipleRespuesta.map((item, idx) => {
      const precioSinSeguro =
        this.obtenerNumeroLimpio(item?.precio) ??
        this.obtenerNumeroLimpio((item as any)?.precioSinSeguro);
      const precioConSeguro =
        this.obtenerNumeroLimpio(item?.precio_con_seguro) ??
        this.obtenerNumeroLimpio((item as any)?.precioConSeguro);
      const precioMeses =
        this.obtenerNumeroLimpio(item?.precio_a_meses) ??
        this.obtenerNumeroLimpio((item as any)?.precioMeses);
      const porcentajeSeguro =
        this.obtenerNumeroLimpio(item?.porcentaje_seguro) ??
        this.obtenerNumeroLimpio((item as any)?.porcentajeSeguro) ??
        porcentajeSeguroGlobal;
      const porcentajeMeses =
        this.obtenerNumeroLimpio(item?.porcentaje_meses) ??
        this.obtenerNumeroLimpio((item as any)?.porcentajeMeses) ??
        porcentajeMesesGlobal;
      const tipoTarifaMeses =
        item?.tipo_tarifa ??
        (item as any)?.tipoTarifa ??
        item?.condiciones_precio_meses?.[0]?.tipoPoliticas ??
        null;

      const condicionesSinSeguro = this.normalizarCondicionesPublicas(
        item?.condiciones_precio ?? (item as any)?.condicionesPrecioSinSeguro,
        this.politicasNoReembolsable
      );
      const condicionesConSeguro = this.normalizarCondicionesPublicas(
        item?.condiciones_precio_seguro ?? (item as any)?.condicionesPrecioConSeguro,
        this.politicasApartado
      );
      const condicionesMeses = this.normalizarCondicionesPublicas(
        item?.condiciones_precio_meses ?? (item as any)?.condicionesPrecioMeses,
        tipoTarifaMeses === 'apartado' ? this.politicasApartadoMeses : this.politicasNoReembolsableMeses
      );

      const apartadoSeguro = this.calcularMontoApartado(precioConSeguro, porcentajeSeguro);
      const apartadoMeses = this.calcularMontoApartado(precioMeses, porcentajeMeses);
      const detalleHabitacion = this.formatearDetalleHabitacionTexto(
        detalleHabitaciones.find((detalle) => detalle.indice === idx + 1)
      );

      return {
        indice: idx + 1,
        tipoHabitacion: this.obtenerNombreTipoHabitacion(item?.tipo_habitacion_id),
        hotelNombre: String(item?.hotel_nombre ?? item?.hotelNombre ?? '').trim() || null,
        detalleHabitacion,
        precioSinSeguro,
        precioConSeguro,
        precioMeses,
        porcentajeSeguro,
        porcentajeMeses,
        fechaLimiteSeguro:
          item?.fecha_limite_seguro ??
          (item as any)?.fechaLimiteSeguro ??
          this.informacionCotizacion?.fecha_limite_seguro ??
          null,
        fechaLimiteMeses:
          item?.fecha_limite_meses ??
          (item as any)?.fechaLimiteMeses ??
          this.informacionCotizacion?.fecha_limite_meses ??
          null,
        tipoTarifaMeses,
        condicionesSinSeguro,
        condicionesConSeguro,
        condicionesMeses,
        apartadoSeguro,
        pagueDespuesSeguro: this.calcularMontoPendiente(precioConSeguro, apartadoSeguro),
        apartadoMeses,
        pagueDespuesMeses: this.calcularMontoPendiente(precioMeses, apartadoMeses),
        origenReservacionPrecio: this.obtenerNumeroLimpio(
          item?.origen_reservacion_precio_id ?? (item as any)?.origenReservacionPrecio
        ),
        origenReservacionConSeguro: this.obtenerNumeroLimpio(
          item?.origen_reservacion_con_seguro_id ?? (item as any)?.origenReservacionConSeguro
        ),
        origenReservacionMeses: this.obtenerNumeroLimpio(
          item?.origen_reservacion_meses_id ?? (item as any)?.origenReservacionMeses
        )
      };
    });
  }

  private obtenerTextoHabitacionesCotizacion(): string {
    const habitaciones = this.informacionCotizacion?.habitaciones;
    if (!habitaciones) return '';
    const texto = (habitaciones.es ?? '').trim() || (habitaciones.traduccion ?? '').trim();
    return texto
      .replace(/\bninos\b/gi, 'menores')
      .replace(/\bnino\b/gi, 'menor')
      .replace(/\bniños\b/gi, 'menores')
      .replace(/\bniño\b/gi, 'menor')
      .replace(/\bhabitacion\b/gi, 'habitación');
  }

  private formatearDetalleHabitacionTexto(detalle?: DetalleHabitacionCotizacion): string | null {
    if (!detalle) return null;

    const partes: string[] = [];
    if (detalle.adultos > 0) {
      partes.push(`${detalle.adultos} adulto${detalle.adultos === 1 ? '' : 's'}`);
    }
    if (detalle.ninos > 0) {
      partes.push(`${detalle.ninos} menor${detalle.ninos === 1 ? '' : 'es'}`);
    }
    if (detalle.extra) {
      partes.push(detalle.extra);
    }

    return partes.length ? partes.join(' · ') : null;
  }

  get resumenHabitacionesYPersonas(): string {
    const detalleHabitaciones = this.obtenerDetalleHabitacionesPdf(this.obtenerTextoHabitacionesCotizacion());
    const totalHabitaciones = detalleHabitaciones.length;

    if (!totalHabitaciones) {
      return '';
    }

    const totalAdultos = detalleHabitaciones.reduce((total, item) => total + item.adultos, 0);
    const totalMenores = detalleHabitaciones.reduce((total, item) => total + item.ninos, 0);
    const resumen = [
      `${totalHabitaciones} habitaci${totalHabitaciones === 1 ? 'ón' : 'ones'}`,
      `${totalAdultos} adulto${totalAdultos === 1 ? '' : 's'}`
    ];

    if (totalMenores > 0) {
      resumen.push(`${totalMenores} menor${totalMenores === 1 ? '' : 'es'}`);
    }

    return resumen.join(' · ');
  }

  detallePersonasHabitacion(indice: number): string {
    const detalle = this.obtenerDetalleHabitacionesEdicion()[indice];
    if (!detalle) return 'Sin datos';

    const total = detalle.adultos + detalle.ninos;
    const desglose = this.formatearDetalleHabitacionTexto(detalle);
    return total > 0
      ? `${total} persona${total === 1 ? '' : 's'}${desglose ? ` · ${desglose}` : ''}`
      : desglose || 'Sin datos';
  }

  get amenidadesDestacadas(): Array<{ id: number; descripcion: string; icono?: string | null }> {
    return (this.informacionCotizacion?.actividades ?? [])
      .filter((item) => String(item?.icono ?? '').trim().length > 0)
      .slice(0, 20);
  }

  get amenidadesLineales(): Array<{ id: number; descripcion: string; icono?: string | null }> {
    return this.amenidadesDestacadas.slice(0, 4);
  }

  get amenidadesCompactas(): Array<{ id: number; descripcion: string; icono?: string | null }> {
    return this.amenidadesDestacadas.slice(4, 6);
  }

  esIconoSvgCrudo(icono?: string | null): boolean {
    return String(icono ?? '').trim().startsWith('<svg');
  }

  tieneIconoCargado(icono?: string | null): boolean {
    return String(icono ?? '').trim().length > 0;
  }

  iconoSvgSeguro(icono?: string | null): SafeHtml {
    const valor = String(icono ?? '').trim();
    const normalizado = valor
      .replace(/fill=("|')#ffffff\1/gi, 'fill="currentColor"')
      .replace(/fill=("|')#fff\1/gi, 'fill="currentColor"')
      .replace(/stroke=("|')#ffffff\1/gi, 'stroke="currentColor"')
      .replace(/stroke=("|')#fff\1/gi, 'stroke="currentColor"');

    return this.sanitizer.bypassSecurityTrustHtml(normalizado);
  }

  async ngOnInit() {
    try {
      this.cargando = true;
      const url = this.router.url;
      const id = this.route.snapshot.paramMap.get('id');
      // this.informacionCotizacion = await this.supabase.obtenerCotizacionPorPublicId(id);
      this.esEdicion = url.includes('edicion-cotizacion') ? true : false
      let datosHotel = {}


      if (this.esEdicion) {
        this.informacionCotizacion = await this.supabase.obtenerCotizacionPorPublicId(id);
        await this.obtenerInformacionCatalogosEdicion();
        this.validacionesPreciosGuardados();

        
        datosHotel = {
          ubicacion: this.informacionCotizacion.ubicacion,
          nombre_hotel: this.informacionCotizacion.nombre_hotel
        }
        this.setActiveLang('es')

      } else {
        this.informacionCotizacion = await this.supabase.obtenerCotizacionPorPublicIdCliente(id);

        await this.cargarCatalogoTiposHabitacion();
        await this.cargarOrigenesReservacionPublicos();
        datosHotel = {
          ubicacion: this.informacionCotizacion.ubicacion,
          nombre_hotel: this.informacionCotizacion.nombre_hotel
        }
        this.validacionesPreciosGuardados();
        this.setActiveLang(this.informacionCotizacion.idioma)
        this.informacionCotizacion.precios.forEach(item => {
          switch (item.tipo) {
            case 'a_meses':
              this.calcularPagos(item.precio, item.porcentaje, item.tipo)
              break;
            case 'con_seguro':
              this.calcularPagos(item.precio, item.porcentaje, item.tipo)
              break;
            default:
              break;
          }
        })

      }
      this.politicasApartado = this.informacionCotizacion.politicas_tarifas.apartado
      this.politicasNoReembolsable = this.informacionCotizacion.politicas_tarifas.noReembolsable
      this.politicasApartadoMeses = this.informacionCotizacion.politicas_tarifas.apartadoMeses
      this.politicasNoReembolsableMeses = this.informacionCotizacion.politicas_tarifas.noReembolsableMeses

      const info = this.informacionCotizacion.precios.find(item => item.tipo === 'a_meses')
      this.edicionForm.patchValue({
        tipoTarifa: info?.condiciones?.[0]?.tipoPoliticas
      })
      this.politicas = info?.condiciones?.[0]?.tipoPoliticas === 'apartado' ? this.politicasApartado : this.politicasNoReembolsable;

      sessionStorage.setItem('hotel', JSON.stringify(datosHotel))

    } finally {
      this.cargando = false;
      this.edicionForm.get('tipoHabitacion')?.valueChanges.subscribe(valor => {

        const texto = typeof valor === 'string' ? valor : valor.nombre_habitacion || '';
        this.filteredOptions$ = this.obtenerTiposHabitacionDisponibles(0).filter(m =>
          m.nombre_habitacion.toUpperCase().includes(texto.toUpperCase())
        );
      });

      this.edicionForm.get('tipoTarifa')?.valueChanges.subscribe(valor => {
        this.edicionForm.patchValue({
          condicionesPrecioMeses: []
        }, { emitEvent: false })
        this.habitacionesAdicionales.controls.forEach((control) => {
          control.patchValue({ condicionesPrecioMeses: [] }, { emitEvent: false });
        });
        this.politicas = valor === 'apartado' ? this.politicasApartadoMeses : this.politicasNoReembolsableMeses;
        this.politicas.forEach(item => {
          item.tipoPoliticas = valor;
        })
      });

      this.edicionForm?.valueChanges.subscribe(valor => {
        const precios = []
        if (valor.precio) precios.push(valor.precio);
        if (valor.precioConSeguro) precios.push(valor.precioConSeguro);
        if (valor.precioMeses) precios.push(valor.precioMeses);
        this.habitacionesAdicionales.controls.forEach((control) => {
          const roomValue = control.value as CotizacionHabitacionForm;
          if (roomValue?.precio) precios.push(roomValue.precio);
          if (roomValue?.precioConSeguro) precios.push(roomValue.precioConSeguro);
          if (roomValue?.precioMeses) precios.push(roomValue.precioMeses);
        });
        this.preciosList = precios;

      })
    }
  }

  async obtenerInformacionCatalogosEdicion() {
    const { data } = await this.supabase.tipoHabitaciones();
    const estatus = await this.supabase.estatusCotizaciones();
    const origenReservacion = await this.catalogosAdmin.obtenerCatalogoAdmin('origen_reservacion');
    this.estatusOpciones = estatus.data

    this.tiposHabitacion = data ?? [];
    this.origenReservacionOpciones = (origenReservacion ?? [])
      .filter((item: any) => Boolean(item?.estatus))
      .map((item: any) => ({
        id: Number(item.id),
        clave: String(item.clave ?? ''),
        nombre_cotizador: String(item.nombre_cotizador ?? ''),
        estatus: Boolean(item.estatus)
      }))
      .filter((item: OrigenReservacionOption) => Number.isFinite(item.id));
    this.filteredOptions$ = this.obtenerTiposHabitacionDisponibles(0);

  }

  private async cargarCatalogoTiposHabitacion() {
    if (this.tiposHabitacion?.length) return;
    const { data } = await this.supabase.tipoHabitaciones();
    this.tiposHabitacion = data ?? [];
    this.filteredOptions$ = this.obtenerTiposHabitacionDisponibles(0);
  }

  get imagenesHotel(): string[] {
    return (this.informacionCotizacion?.imagenes ?? [])
      .map((imagen) => imagen?.url)
      .filter((url): url is string => Boolean(url));
  }

  abrirGaleriaHotel(indice: number, evento: MouseEvent): void {
    this.galeriaHotel?.open(indice, evento);
  }

  private async cargarOrigenesReservacionPublicos(): Promise<void> {
    try {
      const origenes = await this.catalogosAdmin.obtenerCatalogoAdmin('origen_reservacion');
      this.origenReservacionOpciones = (origenes ?? [])
        .map((item: any) => ({
          id: Number(item?.id),
          clave: String(item?.clave ?? ''),
          nombre_cotizador: String(item?.nombre_cotizador ?? ''),
          estatus: Boolean(item?.estatus)
        }))
        .filter((item: OrigenReservacionOption) => Number.isFinite(item.id));
    } catch {
      // El origen es informativo en la cotización pública; no debe impedir verla.
      this.origenReservacionOpciones = [];
    }
  }

  private _filter(value: string): TipoHabitacion[] {
    const filterValue = value.toLowerCase().trim();
    return this.obtenerTiposHabitacionDisponibles(0).filter(option =>
      option.nombre_habitacion.toLowerCase().includes(filterValue)
    );
  }

  displayHabitacion = (option: TipoHabitacion | string | number | null): string => {
    if (!option && option !== 0) return '';
    if (typeof option === 'object') {
      return option.nombre_habitacion ?? '';
    }
    const resolved = this.normalizarTipoHabitacion(option);
    return resolved?.nombre_habitacion ?? '';
  };

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
    if (!this.validarHabitacionesAntesDeGuardar()) return;

    this.enviarCotizacion = true;
    this.supabase.actualizarCotizacionPublicaCompleta(
      this.informacionCotizacion.public_id,
      this.obtenerPayloadEdicion()
    );
  }


  async exportarCotizacionPdf() {
    if (!this.informacionCotizacion?.public_id || this.exportandoPdf) return;

    this.exportandoPdf = true;

    try {
      await this.guardarCambiosAntesDeSalida();

      try {
        await this.descargarPdfProformaCotizacion(this.informacionCotizacion.public_id);
      } catch {
        await this.descargarPdfVistaPublicaCotizacion(this.informacionCotizacion.public_id);
      }
    } catch (error: any) {
      if (error?.message === 'COTIZACION_INVALIDA') {
        window.alert('Completa los campos requeridos y guarda la cotizacion antes de imprimir la cotizacion.');
        return;
      }
      window.alert('No se pudo guardar la cotizacion antes de imprimir. Intenta nuevamente.');
    } finally {
      this.exportandoPdf = false;
    }
  }

  private async guardarCambiosAntesDeSalida(): Promise<void> {
    if (!this.esEdicion || !this.informacionCotizacion?.public_id) return;

    if (!this.validarHabitacionesAntesDeGuardar()) {
      throw new Error('COTIZACION_INVALIDA');
    }

    if (this.edicionForm.invalid) {
      this.edicionForm.markAllAsTouched();
      throw new Error('COTIZACION_INVALIDA');
    }

    await this.supabase.actualizarCotizacionPublicaCompleta(
      this.informacionCotizacion.public_id,
      this.obtenerPayloadEdicion()
    );

    this.informacionCotizacion = await this.supabase.obtenerCotizacionPorPublicId(
      this.informacionCotizacion.public_id
    );
    this.validacionesPreciosGuardados();
    this.edicionForm.markAsPristine();
  }

  get enlaceWhatsappContacto(): string {
    const mensaje = this.mensajeContactoCotizacion;
    return `https://wa.me/526188032003?text=${encodeURIComponent(mensaje)}`;
  }

  get enlaceCorreoContacto(): string {
    const asunto = `Consulta sobre cotización ${this.folioCotizacionVisual()}`;
    return `mailto:reservas@www.trotapie.com?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(this.mensajeContactoCotizacion)}`;
  }

  private get mensajeContactoCotizacion(): string {
    const publicId = this.informacionCotizacion?.public_id || '';
    const url = `https://www.trotapie.com/cotizacion/${publicId}`;
    return `Hola Estoy interesado(a) en esta cotización: ${url} Me gustaría avanzar con la reserva. ¿Me ayudas con los siguientes pasos?`;
  }

  get telefonoCtrl() {
    return this.telefonoForm.get('telefono');
  }

  get ladaCtrl() {
    return this.telefonoForm.get('lada');
  }

  get telefonoInvalido(): boolean {
    const ctrl = this.telefonoCtrl;
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  get correoCtrl() {
    return this.telefonoForm.get('correo');
  }

  get correoInvalido(): boolean {
    const ctrl = this.correoCtrl;
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  get asuntoCtrl() {
    return this.telefonoForm.get('asunto');
  }

  get descripcionCorreoCtrl() {
    return this.telefonoForm.get('descripcionCorreo');
  }

  get tieneTelefonoCapturado(): boolean {
    const telefono = String(this.telefonoCtrl?.value ?? '').replace(/\D/g, '');
    return telefono.length > 0;
  }

  get tieneCorreoCapturado(): boolean {
    return this.obtenerCorreosCapturados().length > 0;
  }

  get textoBotonEnvioCotizacion(): string {
    if (this.tieneTelefonoCapturado && this.tieneCorreoCapturado) {
      return 'Enviar cotizacion por WhatsApp y correo';
    }
    if (this.tieneTelefonoCapturado) {
      return 'Enviar cotizacion por WhatsApp';
    }
    if (this.tieneCorreoCapturado) {
      return 'Enviar cotizacion por correo';
    }
    return 'Enviar cotizacion';
  }

  get puedeEnviarCotizacion(): boolean {
    if (!this.tieneTelefonoCapturado && !this.tieneCorreoCapturado) return false;
    if (this.tieneTelefonoCapturado && !!this.telefonoCtrl?.invalid) return false;
    if (this.tieneCorreoCapturado && !!this.correoCtrl?.invalid) return false;
    return !this.enviandoCorreoCotizacion;
  }

  get precioCtrl() {
    return this.edicionForm.get('precio');
  }

  get precioInvalido(): boolean {
    const ctrl = this.precioCtrl;
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  get puedeGuardarCotizacion(): boolean {
    return this.edicionForm.valid && this.habitacionesCompletas() && !this.exportandoPdf;
  }

  get puedeDescargarPdf(): boolean {
    return this.puedeGuardarCotizacion;
  }

  setCampoPrecioActivo(campo: 'precio' | 'precioConSeguro' | 'precioMeses') {
    this.campoPrecioActivo = campo;
  }

  get totalEstanciaEdicion(): string | number | null {
    const camposActivos = this.obtenerCamposTarifaActivos();
    if (camposActivos.length !== 1) return null;
    return this.totalPorCampo(camposActivos[0]);
  }

  get totalEstanciaPublica(): number | null {
    if (this.esEdicion) return null;
    const tiposActivos = this.obtenerTiposTarifaPublicaActivos();
    if (tiposActivos.length !== 1) return null;
    return this.totalPublicoPorTarifa(tiposActivos[0]);
  }

  get mostrarTotalEstanciaPublica(): boolean {
    return !this.esEdicion && this.obtenerTiposTarifaPublicaActivos().length === 1;
  }

  get mostrarTotalEstanciaEdicion(): boolean {
    return this.obtenerCamposTarifaActivos().length === 1;
  }

  getEtiquetaCotizacionMultiple(item: HabitacionCotizacionPublicaVista | null | undefined): string {
    if (!item) return 'Hotel';
    return item.hotelNombre?.trim() || item.tipoHabitacion?.trim() || `Hotel ${item.indice}`;
  }

  mostrarTotalPorCampo(campo: 'precio' | 'precioConSeguro' | 'precioMeses'): boolean {
    return this.totalPorCampoPublico(campo) !== null;
  }

  totalPorCampoPublico(campo: 'precio' | 'precioConSeguro' | 'precioMeses'): number | null {
    const tipo = campo === 'precio'
      ? 'sin_seguro'
      : campo === 'precioConSeguro'
        ? 'con_seguro'
        : 'a_meses';

    return this.totalPublicoPorTarifa(tipo);
  }

  totalPagoPublicoPorCampo(campo: 'apartadoSeguro' | 'pagueDespuesSeguro' | 'apartadoMeses' | 'pagueDespuesMeses'): number | null {
    const valores = this.habitacionesCotizacionPublicaVista
      .map(habitacion => habitacion[campo])
      .filter((valor): valor is number => valor !== null);

    return valores.length ? valores.reduce((total, valor) => total + valor, 0) : null;
  }

  private obtenerPayloadEdicion(): any {
    const cotizacionMultiple = this.habitacionesAdicionales.length > 0
      ? this.obtenerCotizacionMultiple()
      : null;

    return {
      ...this.edicionForm.value,
      cotizacionMultiple
    };
  }

  private totalPorCampo(campo: 'precio' | 'precioConSeguro' | 'precioMeses'): number | null {
    const valores: number[] = [];

    const principal = this.obtenerNumeroLimpio(this.edicionForm.get(campo)?.value);
    if (principal !== null) valores.push(principal);

    this.habitacionesAdicionales.controls.forEach((control) => {
      const value = this.obtenerNumeroLimpio(control.get(campo)?.value);
      if (value !== null) valores.push(value);
    });

    if (!valores.length) return null;
    return valores.reduce((acc, current) => acc + current, 0);
  }

  private obtenerCamposTarifaActivos(): Array<'precio' | 'precioConSeguro' | 'precioMeses'> {
    const campos: Array<'precio' | 'precioConSeguro' | 'precioMeses'> = [
      'precio',
      'precioConSeguro',
      'precioMeses'
    ];

    return campos.filter((campo) => this.totalPorCampo(campo) !== null);
  }

  private obtenerTiposTarifaPublicaActivos(): TarifaPublica[] {
    const tipos: TarifaPublica[] = ['sin_seguro', 'con_seguro', 'a_meses'];
    return tipos.filter((tipo) => this.totalPublicoPorTarifa(tipo) !== null);
  }

  private totalPublicoPorTarifa(tipo: TarifaPublica): number | null {
    const habitaciones = this.habitacionesCotizacionPublicaVista;

    if (habitaciones.length) {
      const valores = habitaciones
        .map((habitacion) => {
          if (tipo === 'sin_seguro') return habitacion.precioSinSeguro;
          if (tipo === 'con_seguro') return habitacion.precioConSeguro;
          return habitacion.precioMeses;
        })
        .filter((valor): valor is number => valor !== null);

      if (!valores.length) return null;
      return valores.reduce((acc, current) => acc + current, 0);
    }

    const precioBase = this.informacionCotizacion?.precios?.find((precio) => precio.tipo === tipo);
    return this.obtenerNumeroLimpio(precioBase?.precio);
  }

  soloNumeros(event: Event) {
    const input = event.target as HTMLInputElement;
    const limpio = input.value.replace(/\D/g, '');
    this.telefonoCtrl?.setValue(limpio, { emitEvent: false });
  }

  async sendCotizacion() {
    await this.enviarCotizacionCliente();
  }

  async enviarCotizacionCorreo() {
    await this.enviarCotizacionCliente();
  }

  async enviarCotizacionCliente() {
    const telefonoValido = this.tieneTelefonoCapturado && !this.telefonoCtrl?.invalid;
    const correos = this.obtenerCorreosCapturados();
    const correoTexto = correos.join(', ');
    const tieneCorreos = correos.length > 0;
    const correoValido = this.tieneCorreoCapturado && !this.correoCtrl?.invalid;
    const asuntoCapturado = String(this.asuntoCtrl?.value ?? '').trim();
    const descripcion = String(this.descripcionCorreoCtrl?.value ?? '').trim();

    if (!this.tieneTelefonoCapturado && !tieneCorreos) {
      this.mensajeCorreoCotizacion = 'Captura un telefono y/o correo para enviar la cotizacion.';
      return;
    }
    if (this.tieneTelefonoCapturado && !telefonoValido) {
      this.telefonoCtrl?.markAsTouched();
      return;
    }
    if (this.tieneCorreoCapturado && !correoValido) {
      this.correoCtrl?.markAsTouched();
      return;
    }
    if (!this.informacionCotizacion?.public_id) return;

    this.enviandoCorreoCotizacion = true;
    this.mensajeCorreoCotizacion = '';

    try {
      if (telefonoValido) {
        await this.enviarCotizacionWhatsapp();
      }

      if (correoValido) {
        await this.enviarCotizacionCorreoInterno(
          correos,
          asuntoCapturado,
          descripcion
        );
      }

      if (telefonoValido && correoValido) {
        this.mensajeCorreoCotizacion = `Cotizacion enviada por WhatsApp y correo a ${correoTexto}.`;
      } else if (telefonoValido) {
        this.mensajeCorreoCotizacion = 'Cotizacion enviada por WhatsApp.';
      } else {
        this.mensajeCorreoCotizacion = `Cotizacion enviada por correo a ${correoTexto}.`;
      }

      this.enviarCotizacion = false;
    } catch (error: any) {
      if (error?.message === 'COTIZACION_INVALIDA') {
        this.mensajeCorreoCotizacion = 'Completa los campos requeridos para guardar la cotizacion antes de enviar.';
        return;
      }
      this.mensajeCorreoCotizacion = error?.message ?? 'No se pudo enviar la cotizacion.';
    } finally {
      this.enviandoCorreoCotizacion = false;
    }
  }

  private async enviarCotizacionWhatsapp(): Promise<void> {
    const telefono = this.telefonoForm.get('telefono')?.value ?? '';
    const telefonoLimpio = String(telefono).replace(/\D/g, '');
    const lada = String(this.ladaCtrl?.value ?? this.defaultDialCode).replace(/\D/g, '');
    const url = `https://www.trotapie.com/cotizacion/${this.informacionCotizacion.public_id}`;

    const mensaje = await this.buildMensajeCotizacionViaje(url);
    const mensajeCodificado = encodeURIComponent(mensaje);
    const whatsappUrl = `https://wa.me/${lada}${telefonoLimpio}?text=${mensajeCodificado}`;

    window.open(whatsappUrl, '_blank');
  }

  private async enviarCotizacionCorreoInterno(
    correos: string[],
    asunto: string,
    descripcion: string
  ): Promise<void> {
    await this.guardarCambiosAntesDeSalida();

    const asuntoPredeterminado = this.asuntoPredeterminado;
    const asuntoFinal = asunto || asuntoPredeterminado;

    await this.supabase.enviarCorreoCotizacion({
      to_email: correos.join(', '),
      to_name: this.informacionCotizacion?.cliente_nombre ?? '',
      hotel_nombre: this.informacionCotizacion?.nombre_hotel ?? '',
      fecha_entrada: this.informacionCotizacion?.fecha_entrada ?? null,
      fecha_salida: this.informacionCotizacion?.fecha_salida ?? null,
      noches: this.informacionCotizacion?.noches ?? null,
      telefono: this.telefonoCompleto(),
      public_id: this.informacionCotizacion?.public_id ?? null,
      asunto: asuntoFinal,
      mensaje: descripcion || null
    });
  }

  get asuntoPredeterminado(): string {
    const clienteNombre = String(this.informacionCotizacion?.cliente_nombre ?? '').trim();
    if (clienteNombre) {
      return `Cotizacion para ${clienteNombre}`;
    }

    const hotelNombre = String(this.informacionCotizacion?.nombre_hotel ?? '').trim();
    if (hotelNombre) {
      return `Cotizacion de viaje para ${hotelNombre}`;
    }

    const folio = this.folioCotizacionVisual();
    if (folio) {
      return `Cotizacion de viaje ${folio}`;
    }

    return 'Cotizacion de viaje';
  }

  folioCotizacionVisual(
    valor: number | string | null | undefined = this.informacionCotizacion?.id
  ): string {
    return formatearFolioCotizacion(valor) || `CTRO-${String(valor ?? '').trim()}`;
  }

  private obtenerCorreosCapturados(): string[] {
    const valor = String(this.correoCtrl?.value ?? '');
    return valor
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  telefonoCompleto(): string {
    const lada = String(this.ladaCtrl?.value ?? this.defaultDialCode).replace(/\D/g, '');
    const telefono = String(this.telefonoCtrl?.value ?? '').replace(/\D/g, '');
    if (!telefono) return '';
    return `+${lada}${telefono}`;
  }

  abrirUbicacion() {
    this.mostrarMapa = !this.mostrarMapa;
  }

  private async descargarPdfProformaCotizacion(
    publicId: string,
    options?: { descargar?: boolean }
  ): Promise<any> {
    const { jsPDF } = await import('jspdf');
    const cotizacion = this.informacionCotizacion;
    const pdf: any = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const contentWidth = pageWidth - margin * 2;
    const footerHeight = 10;
    let y = margin;

    const green: [number, number, number] = [0, 132, 106];
    const greenDark: [number, number, number] = [0, 104, 85];
    const greenSoft: [number, number, number] = [230, 247, 242];
    const navy: [number, number, number] = [14, 28, 56];
    const textColor: [number, number, number] = [22, 33, 53];
    const mutedColor: [number, number, number] = [87, 101, 123];
    const borderColor: [number, number, number] = [218, 226, 232];
    const pageBgColor: [number, number, number] = [249, 250, 247];

    const moneda = (valor?: number | null): string => {
      const numero = Number(valor ?? 0);
      if (!Number.isFinite(numero)) return '$0';
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        maximumFractionDigits: 0
      }).format(numero);
    };

    const fecha = (value?: string | Date | null): string => {
      if (!value) return '-';
      const parsed = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(parsed.getTime())) return '-';
      return new Intl.DateTimeFormat('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(parsed);
    };

    const limpiar = (value: unknown): string => (value ?? '').toString().trim();

    const fechaHora = (value?: string | Date | null): string => {
      if (!value) return '-';
      const parsed = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(parsed.getTime())) return '-';
      return new Intl.DateTimeFormat('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(parsed);
    };

    const split = (text: string, width: number): string[] => pdf.splitTextToSize(text || '-', width);

    const drawText = (
      text: string | string[],
      x: number,
      yPos: number,
      options?: { size?: number; bold?: boolean; color?: [number, number, number]; align?: 'left' | 'center' | 'right'; maxWidth?: number }
    ): void => {
      pdf.setFont('helvetica', options?.bold ? 'bold' : 'normal');
      pdf.setFontSize(options?.size ?? 8);
      pdf.setTextColor(...(options?.color ?? textColor));
      pdf.text(text, x, yPos, { align: options?.align ?? 'left', maxWidth: options?.maxWidth });
    };

    const drawIcon = (
      name: 'spark' | 'calendar' | 'moon' | 'home' | 'users' | 'mail' | 'phone' | 'bed' | 'card' | 'check',
      x: number,
      yPos: number,
      color: [number, number, number] = greenDark,
      scale = 1
    ): void => {
      pdf.setDrawColor(...color);
      pdf.setFillColor(...color);
      pdf.setLineWidth(0.35 * scale);

      if (name === 'spark') {
        pdf.line(x, yPos + 1.7 * scale, x + 3.4 * scale, yPos + 1.7 * scale);
        pdf.line(x + 1.7 * scale, yPos, x + 1.7 * scale, yPos + 3.4 * scale);
        pdf.circle(x + 1.7 * scale, yPos + 1.7 * scale, 0.35 * scale, 'F');
        return;
      }

      if (name === 'calendar') {
        pdf.roundedRect(x, yPos, 4.6 * scale, 4.2 * scale, 0.4 * scale, 0.4 * scale, 'S');
        pdf.line(x, yPos + 1.3 * scale, x + 4.6 * scale, yPos + 1.3 * scale);
        pdf.line(x + 1.1 * scale, yPos - 0.45 * scale, x + 1.1 * scale, yPos + 0.7 * scale);
        pdf.line(x + 3.5 * scale, yPos - 0.45 * scale, x + 3.5 * scale, yPos + 0.7 * scale);
        return;
      }

      if (name === 'moon') {
        pdf.circle(x + 2.2 * scale, yPos + 2 * scale, 1.8 * scale, 'S');
        pdf.setDrawColor(...pageBgColor);
        pdf.setFillColor(...pageBgColor);
        pdf.circle(x + 3 * scale, yPos + 1.5 * scale, 1.7 * scale, 'F');
        return;
      }

      if (name === 'home') {
        pdf.line(x, yPos + 2.2 * scale, x + 2.4 * scale, yPos);
        pdf.line(x + 2.4 * scale, yPos, x + 4.8 * scale, yPos + 2.2 * scale);
        pdf.rect(x + 0.8 * scale, yPos + 2.1 * scale, 3.2 * scale, 2.5 * scale, 'S');
        return;
      }

      if (name === 'users') {
        pdf.circle(x + 1.4 * scale, yPos + 1.2 * scale, 0.9 * scale, 'S');
        pdf.circle(x + 3.6 * scale, yPos + 1.4 * scale, 0.75 * scale, 'S');
        pdf.arc?.(x + 0.2 * scale, yPos + 4.1 * scale, x + 2.7 * scale, yPos + 2.2 * scale, 180, 360, 'S');
        pdf.arc?.(x + 2.7 * scale, yPos + 4.1 * scale, x + 4.8 * scale, yPos + 2.5 * scale, 180, 360, 'S');
        return;
      }

      if (name === 'mail') {
        pdf.roundedRect(x, yPos, 5 * scale, 3.4 * scale, 0.4 * scale, 0.4 * scale, 'S');
        pdf.line(x, yPos, x + 2.5 * scale, yPos + 1.9 * scale);
        pdf.line(x + 5 * scale, yPos, x + 2.5 * scale, yPos + 1.9 * scale);
        return;
      }

      if (name === 'phone') {
        pdf.roundedRect(x + 1.2 * scale, yPos, 2.6 * scale, 5 * scale, 0.7 * scale, 0.7 * scale, 'S');
        pdf.circle(x + 2.5 * scale, yPos + 4.2 * scale, 0.25 * scale, 'F');
        return;
      }

      if (name === 'bed') {
        pdf.rect(x, yPos + 1.8 * scale, 5 * scale, 2 * scale, 'S');
        pdf.rect(x + 0.4 * scale, yPos + 0.8 * scale, 1.6 * scale, 1 * scale, 'S');
        pdf.line(x, yPos + 3.8 * scale, x, yPos + 4.5 * scale);
        pdf.line(x + 5 * scale, yPos + 3.8 * scale, x + 5 * scale, yPos + 4.5 * scale);
        return;
      }

      if (name === 'card') {
        pdf.roundedRect(x, yPos, 5 * scale, 3.5 * scale, 0.4 * scale, 0.4 * scale, 'S');
        pdf.line(x, yPos + 1.1 * scale, x + 5 * scale, yPos + 1.1 * scale);
        pdf.line(x + 0.7 * scale, yPos + 2.4 * scale, x + 2.2 * scale, yPos + 2.4 * scale);
        return;
      }

      pdf.circle(x + 2 * scale, yPos + 2 * scale, 1.9 * scale, 'S');
      pdf.line(x + 1.1 * scale, yPos + 2 * scale, x + 1.8 * scale, yPos + 2.7 * scale);
      pdf.line(x + 1.8 * scale, yPos + 2.7 * scale, x + 3.1 * scale, yPos + 1.3 * scale);
    };

    const drawFooter = (): void => {
      pdf.setFillColor(...green);
      pdf.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F');
      drawIcon('mail', pageWidth / 2 - 56, pageHeight - 6.8, [255, 255, 255], 0.85);
      drawText('reservas@www.trotapie.com', pageWidth / 2 - 28, pageHeight - 3.8, { size: 7, color: [255, 255, 255], align: 'center' });
      drawIcon('phone', pageWidth / 2 + 13, pageHeight - 7.3, [255, 255, 255], 0.82);
      drawText('+52 618 803 2093', pageWidth / 2 + 34, pageHeight - 3.8, { size: 7, color: [255, 255, 255], align: 'center' });
      pdf.setDrawColor(255, 255, 255);
      pdf.setLineWidth(0.12);
      pdf.line(pageWidth / 2, pageHeight - 8, pageWidth / 2, pageHeight - 2.2);
    };

    const paintPage = (): void => {
      pdf.setFillColor(...pageBgColor);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      drawFooter();
    };

    const ensureSpace = (requiredHeight: number, header = true): void => {
      if (y + requiredHeight <= pageHeight - footerHeight - 7) return;
      pdf.addPage();
      paintPage();
      y = margin;
      if (header) {
        drawText('Cotizacion de hospedaje', margin, y + 6, { size: 14, bold: true, color: navy });
        drawText(`Folio: ${folioCotizacion}`, pageWidth - margin, y + 6, { size: 8, color: mutedColor, align: 'right' });
        y += 13;
      }
    };

    const roundedBox = (x: number, yPos: number, w: number, h: number, fill: [number, number, number] = [255, 255, 255]): void => {
      pdf.setDrawColor(...borderColor);
      pdf.setFillColor(...fill);
      pdf.roundedRect(x, yPos, w, h, 3, 3, 'FD');
    };

    const drawPill = (text: string, x: number, yPos: number, w: number): void => {
      pdf.setFillColor(...greenSoft);
      pdf.roundedRect(x, yPos, w, 7, 2, 2, 'F');
      drawIcon('spark', x + 4, yPos + 1.8, greenDark, 0.8);
      drawText(text, x + 9, yPos + 4.7, { size: 7, bold: true, color: greenDark });
    };

    const drawLabelValue = (label: string, value: string, x: number, yPos: number, w: number): number => {
      drawText(label, x, yPos, { size: 6.4, bold: true, color: greenDark });
      const lines = split(value || '-', w);
      drawText(lines, x, yPos + 4, { size: 7, color: textColor });
      return 4 + lines.length * 3.4;
    };

    paintPage();

    const logoDataUrl = await this.obtenerImagenComoDataURL('/assets/images/logos/trotapie.png');
    const hotelImageSource =
      limpiar((cotizacion as any)?.imagen_cotizacion) ||
      limpiar(cotizacion?.fondo) ||
      limpiar(cotizacion?.imagenes?.[0]?.url);
    const hotelImageDataUrl = hotelImageSource ? await this.obtenerImagenComoDataURL(hotelImageSource) : null;
    const folioCotizacion = this.folioCotizacionVisual(cotizacion?.id);

    const precios = cotizacion.precios ?? [];
    const precioSinSeguro = precios.find((p) => p.tipo === 'sin_seguro');
    const precioConSeguro = precios.find((p) => p.tipo === 'con_seguro');
    const precioMeses = precios.find((p) => p.tipo === 'a_meses');
    const habitacionesFuente =
      limpiar(cotizacion?.habitaciones?.es) ||
      limpiar(cotizacion?.habitaciones?.traduccion);
    const detalleHabitaciones = this.obtenerDetalleHabitacionesPdf(habitacionesFuente);
    const habitacionesCotizacion = this.construirHabitacionesCotizacionVista();
    const habitacionesVista: HabitacionCotizacionPublicaVista[] = habitacionesCotizacion.length
      ? habitacionesCotizacion
      : [{
        indice: 1,
        tipoHabitacion: this.obtenerNombreTipoHabitacion(cotizacion?.tipo_habitacion as number | null),
        hotelNombre: cotizacion?.nombre_hotel ?? null,
        detalleHabitacion: this.formatearDetalleHabitacionTexto(detalleHabitaciones[0]) || habitacionesFuente || null,
        precioSinSeguro: this.obtenerNumeroLimpio(precioSinSeguro?.precio),
        precioConSeguro: this.obtenerNumeroLimpio(precioConSeguro?.precio),
        precioMeses: this.obtenerNumeroLimpio(precioMeses?.precio),
        porcentajeSeguro: this.obtenerNumeroLimpio(precioConSeguro?.porcentaje) ?? this.obtenerNumeroLimpio(cotizacion?.porcentaje_seguro),
        porcentajeMeses: this.obtenerNumeroLimpio(precioMeses?.porcentaje) ?? this.obtenerNumeroLimpio(cotizacion?.porcentaje_meses),
        fechaLimiteSeguro: cotizacion?.fecha_limite_seguro ?? null,
        fechaLimiteMeses: cotizacion?.fecha_limite_meses ?? null,
        tipoTarifaMeses: null,
        condicionesSinSeguro: precioSinSeguro?.condiciones ?? [],
        condicionesConSeguro: precioConSeguro?.condiciones ?? [],
        condicionesMeses: precioMeses?.condiciones ?? [],
        apartadoSeguro: this.calcularMontoApartado(this.obtenerNumeroLimpio(precioConSeguro?.precio), this.obtenerNumeroLimpio(precioConSeguro?.porcentaje) ?? this.obtenerNumeroLimpio(cotizacion?.porcentaje_seguro)),
        pagueDespuesSeguro: this.calcularMontoPendiente(
          this.obtenerNumeroLimpio(precioConSeguro?.precio),
          this.calcularMontoApartado(this.obtenerNumeroLimpio(precioConSeguro?.precio), this.obtenerNumeroLimpio(precioConSeguro?.porcentaje) ?? this.obtenerNumeroLimpio(cotizacion?.porcentaje_seguro))
        ),
        apartadoMeses: this.calcularMontoApartado(this.obtenerNumeroLimpio(precioMeses?.precio), this.obtenerNumeroLimpio(precioMeses?.porcentaje) ?? this.obtenerNumeroLimpio(cotizacion?.porcentaje_meses)),
        pagueDespuesMeses: this.calcularMontoPendiente(
          this.obtenerNumeroLimpio(precioMeses?.precio),
          this.calcularMontoApartado(this.obtenerNumeroLimpio(precioMeses?.precio), this.obtenerNumeroLimpio(precioMeses?.porcentaje) ?? this.obtenerNumeroLimpio(cotizacion?.porcentaje_meses))
        ),
        origenReservacionPrecio: null,
        origenReservacionConSeguro: null,
        origenReservacionMeses: null
      }];
    const regimenCotizacion = limpiar(cotizacion?.regimen) || '-';

    drawText('Cotizacion de hospedaje', margin, y + 8, { size: 18, bold: true, color: navy });
    if (logoDataUrl) {
      pdf.addImage(logoDataUrl, 'PNG', pageWidth - margin - 64, y, 56, 20, undefined, 'FAST');
    } else {
      drawText('trotapie', pageWidth - margin, y + 12, { size: 24, bold: true, color: green, align: 'right' });
    }
    y += 24;
    drawText(limpiar(cotizacion.destino_nombre) || '-', margin + 2, y, { size: 10, bold: true, color: greenDark });
    drawText(limpiar(cotizacion.cliente_nombre) || 'Cliente', margin + 2, y + 8, { size: 11, color: textColor });
    drawText(`Folio: ${folioCotizacion}`, margin + 62, y + 8, { size: 7, color: mutedColor });
    drawPill('Ya casi tienes listo tu viaje', margin + 2, y + 13, 58);

    roundedBox(pageWidth - margin - 67, y - 6, 67, 24);
    drawText(`Te atendio: ${limpiar(cotizacion.empleado_nombre) || 'Trotapie'}`, pageWidth - margin - 34, y + 1, { size: 7, bold: true, color: navy, align: 'center' });
    drawText('Contacto agente', pageWidth - margin - 34, y + 7, { size: 6, color: mutedColor, align: 'center' });
    drawText(fechaHora(cotizacion.fecha_creacion), pageWidth - margin - 34, y + 15, { size: 6.4, color: textColor, align: 'center' });
    y += 28;

    const hotelBoxH = 58;
    roundedBox(margin, y, contentWidth, hotelBoxH);
    if (hotelImageDataUrl) {
      pdf.addImage(hotelImageDataUrl, 'JPEG', margin + 5, y + 6, 100, 46, undefined, 'FAST');
    } else {
      pdf.setFillColor(225, 236, 232);
      pdf.roundedRect(margin + 5, y + 6, 100, 46, 2, 2, 'F');
      drawText('Imagen del hotel', margin + 55, y + 30, { size: 8, bold: true, color: greenDark, align: 'center' });
    }
    const hotelX = margin + 110;
    drawText(limpiar(cotizacion.nombre_hotel) || 'Hotel seleccionado', hotelX, y + 12, { size: 12, bold: true, color: navy, maxWidth: contentWidth - 116 });
    drawIcon('calendar', hotelX, y + 22, greenDark, 0.85);
    drawText(`${fecha(cotizacion.fecha_entrada)} - ${fecha(cotizacion.fecha_salida)}`, hotelX + 7, y + 25, { size: 7.2, color: textColor });
    drawIcon('moon', hotelX, y + 29, greenDark, 0.85);
    drawText(`${cotizacion.noches ?? 0} noches`, hotelX + 7, y + 32, { size: 7.2, color: textColor });
    drawIcon('home', hotelX, y + 36, greenDark, 0.85);
    drawText(regimenCotizacion, hotelX + 7, y + 39, { size: 7.2, color: textColor });
    drawIcon('users', hotelX, y + 43, greenDark, 0.85);
    drawText(habitacionesVista[0]?.detalleHabitacion || habitacionesFuente || '-', hotelX + 7, y + 46, { size: 7.2, color: textColor, maxWidth: contentWidth - 123 });
    y += hotelBoxH + 6;

    type PdfOption = {
      title: string;
      subtitle: string;
      total: number | null;
      field: 'precioSinSeguro' | 'precioConSeguro' | 'precioMeses';
      conditionsField: 'condicionesSinSeguro' | 'condicionesConSeguro' | 'condicionesMeses';
      payment?: (habitacion: HabitacionCotizacionPublicaVista) => string[];
    };

    const sumBy = (field: PdfOption['field']): number | null => {
      const values = habitacionesVista.map((item) => item[field]).filter((value): value is number => value !== null);
      return values.length ? values.reduce((acc, value) => acc + value, 0) : null;
    };

    const opcionesBase: PdfOption[] = [
      {
        title: 'Opcion 1 - No reembolsable',
        subtitle: 'Mejor precio',
        total: sumBy('precioSinSeguro'),
        field: 'precioSinSeguro',
        conditionsField: 'condicionesSinSeguro'
      },
      {
        title: 'Opcion 2 - Apartado',
        subtitle: 'Reserva con anticipo',
        total: sumBy('precioConSeguro'),
        field: 'precioConSeguro',
        conditionsField: 'condicionesConSeguro',
        payment: (habitacion) => [
          `Anticipo para reservar: ${moneda(habitacion.apartadoSeguro)}`,
          `Saldo pendiente: ${moneda(habitacion.pagueDespuesSeguro)}`,
          `Fecha limite de pago: ${fecha(habitacion.fechaLimiteSeguro)}`
        ]
      },
      {
        title: 'Opcion 3 - Pago a meses',
        subtitle: 'Facilidad de pago',
        total: sumBy('precioMeses'),
        field: 'precioMeses',
        conditionsField: 'condicionesMeses',
        payment: (habitacion) => [
          `Anticipo para reservar: ${moneda(habitacion.apartadoMeses)}`,
          `Saldo pendiente: ${moneda(habitacion.pagueDespuesMeses)}`,
          `Fecha limite de pago: ${fecha(habitacion.fechaLimiteMeses)}`
        ]
      }
    ];
    const opciones = opcionesBase.filter((opcion) => opcion.total !== null);

    const drawOptionCard = (opcion: PdfOption, x: number, yPos: number, w: number, h: number): void => {
      roundedBox(x, yPos, w, h);
      pdf.setFillColor(...greenDark);
      pdf.roundedRect(x, yPos, w, 12, 3, 3, 'F');
      drawText(opcion.title, x + w / 2, yPos + 7.6, { size: 7, bold: true, color: [255, 255, 255], align: 'center' });
      drawText(opcion.subtitle, x + w / 2, yPos + 20, { size: 6.2, bold: true, color: greenDark, align: 'center' });
      drawIcon('bed', x + 4, yPos + 25.3, greenDark, 0.8);
      drawText('Resumen de hospedaje', x + 11, yPos + 29, { size: 6.2, bold: true, color: greenDark });

      let yy = yPos + 35;
      habitacionesVista.forEach((habitacion) => {
        const precio = habitacion[opcion.field];
        if (precio === null) return;
        drawIcon('bed', x + 4, yy - 3.3, mutedColor, 0.58);
        drawText(limpiar(habitacion.tipoHabitacion) || limpiar(habitacion.hotelNombre) || `Habitacion ${habitacion.indice}`, x + 8, yy, { size: 6.3, color: textColor, maxWidth: w - 38 });
        drawText(moneda(precio), x + w - 4, yy, { size: 6.6, bold: true, color: greenDark, align: 'right' });
        yy += 4.2;
        if (habitacion.detalleHabitacion) {
          drawText(habitacion.detalleHabitacion, x + 7, yy, { size: 5.8, color: mutedColor, maxWidth: w - 11 });
          yy += 4.2;
        }
      });

      if (opcion.payment) {
        yy += 2;
        drawIcon('card', x + 4, yy - 3.2, greenDark, 0.78);
        drawText('Esquema de pago', x + 11, yy, { size: 6.2, bold: true, color: greenDark });
        yy += 4;
        for (const line of opcion.payment(habitacionesVista[0])) {
          drawText(line, x + 4, yy, { size: 5.8, color: textColor, maxWidth: w - 8 });
          yy += 3.8;
        }
      }

      pdf.setDrawColor(...borderColor);
      pdf.line(x + 4, yy + 2, x + w - 4, yy + 2);
      drawText('Total:', x + 4, yy + 8, { size: 7, bold: true, color: textColor });
      drawText(moneda(opcion.total), x + 4, yy + 18, { size: 17, bold: true, color: greenDark });
      drawText('MXN', x + w - 8, yy + 18, { size: 7, bold: true, color: greenDark, align: 'right' });
      yy += 29;

      drawText('Politicas de reserva', x + 4, yy, { size: 6.3, bold: true, color: greenDark });
      yy += 4;
      const condiciones = habitacionesVista
        .flatMap((habitacion) => habitacion[opcion.conditionsField] ?? [])
        .map((condicion) => limpiar(condicion?.descripcion))
        .filter((item, index, self) => item && self.indexOf(item) === index);
      const politicas = condiciones.length ? condiciones : ['Pago total para confirmar', 'No permite cambios ni cancelaciones'];
      for (const politica of politicas.slice(0, 5)) {
        drawIcon('check', x + 4, yy - 3.1, greenDark, 0.58);
        const lines = split(politica, w - 13);
        drawText(lines, x + 10, yy, { size: 5.7, color: textColor });
        yy += lines.length * 3.3 + 1;
      }
    };

    const cardGap = 5;
    let optionIndex = 0;
    while (optionIndex < opciones.length) {
      const rowOptions = opciones.slice(optionIndex, optionIndex + 3);
      const rowCount = rowOptions.length;
      const cardW = (contentWidth - cardGap * (rowCount - 1)) / rowCount;
      const cardH = 127;
      ensureSpace(cardH + 6, optionIndex > 0);
      rowOptions.forEach((opcion, idx) => drawOptionCard(opcion, margin + idx * (cardW + cardGap), y, cardW, cardH));
      y += cardH + 7;
      optionIndex += 3;
    }

    ensureSpace(24);
    roundedBox(margin, y, contentWidth, 18);
    drawText('Informacion importante', margin + 4, y + 6, { size: 8, bold: true, color: navy });
    drawText('Los precios son informativos, sujetos a disponibilidad del producto.', margin + 4, y + 11, { size: 5.9, color: textColor });
    drawText('No podemos garantizar estos precios y/o producto sigan disponibles al momento de la contratacion.', margin + 4, y + 15, { size: 5.9, color: textColor });

    if (options?.descargar !== false) {
      pdf.save(`cotizacion-${folioCotizacion}.pdf`);
    }

    return pdf;
  }
  private obtenerDetalleHabitacionesPdf(texto: string): DetalleHabitacionCotizacion[] {
    if (!texto) return [];

    const normalizado = texto
      .replace(/\r?\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const segmentos: Array<{ indice: number; detalle: string }> = [];
    const regexHabitacion = /habitaci[oó]n\s*(\d+)\s*:\s*(.*?)(?=habitaci[oó]n\s*\d+\s*:|$)/gi;
    let match: RegExpExecArray | null;

    while ((match = regexHabitacion.exec(normalizado)) !== null) {
      const indice = Number(match[1]);
      const detalle = (match[2] ?? '').trim();
      if (!Number.isFinite(indice)) continue;
      segmentos.push({ indice, detalle });
    }

    if (segmentos.length) {
      return segmentos.map(({ indice, detalle }) => {
        const adultosMatch = detalle.match(/(\d+)\s*adult(?:o|os)/i);
        const ninosMatch = detalle.match(/(\d+)\s*(?:ni(?:n|ñ)(?:o|os)|menor(?:es)?)/i);
        const extra = this.limpiarDetalleExtraHabitacion(detalle);

        return {
          indice,
          habitacion: `Habitacion ${indice}`,
          adultos: adultosMatch ? Number(adultosMatch[1]) : 0,
          ninos: ninosMatch ? Number(ninosMatch[1]) : 0,
          extra: extra || undefined,
        };
      });
    }

    const lineas = texto
      .split(/\r?\n/)
      .map((linea) => linea.trim())
      .filter(Boolean);

    return lineas.map((linea, index) => {
      const habitacionMatch = linea.match(/habitaci[oó]n\s*(\d+)/i);
      const adultosMatch = linea.match(/(\d+)\s*adult(?:o|os)/i);
      const ninosMatch = linea.match(/(\d+)\s*(?:ni(?:n|ñ)(?:o|os)|menor(?:es)?)/i);
      const extra = this.limpiarDetalleExtraHabitacion(
        linea.includes(':') ? linea.split(':').slice(1).join(':').trim() : linea
      );
      const indice = habitacionMatch ? Number(habitacionMatch[1]) : index + 1;

      return {
        indice,
        habitacion: `Habitacion ${indice}`,
        adultos: adultosMatch ? Number(adultosMatch[1]) : 0,
        ninos: ninosMatch ? Number(ninosMatch[1]) : 0,
        extra: extra || undefined,
      };
    });
  }

  private limpiarDetalleExtraHabitacion(texto: string): string {
    return texto
      .replace(/\b\d+\s*adult(?:o|os)\b/gi, '')
      .replace(/\b\d+\s*(?:ni(?:n|ñ)(?:o|os)|menor(?:es)?)\b/gi, '')
      .replace(/\s*[-\u00B7]+\s*/g, ' · ')
      .replace(/(?:\s*·\s*){2,}/g, ' · ')
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s+/g, ' ')
      .replace(/^[\s·,\-:]+|[\s·,\-:]+$/g, '')
      .trim();
  }

  private async obtenerImagenComoDataURL(src: string): Promise<string | null> {
    try {
      const response = await fetch(src);
      if (!response.ok) return null;
      const blob = await response.blob();

      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  private async descargarPdfVistaPublicaCotizacion(publicId: string): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = '1280px';
    iframe.style.height = '720px';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    iframe.style.pointerEvents = 'none';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.src = `${window.location.origin}/cotizacion/${publicId}`;

    document.body.appendChild(iframe);

    const cleanup = () => {
      iframe.remove();
    };

    try {
      await this.esperarCargaIframe(iframe);
      const iframeDoc = iframe.contentDocument;
      if (!iframeDoc) return;

      await this.esperarImagenes(iframeDoc);
      await this.delay(500);

      const raiz = (iframeDoc.querySelector('.print-area') as HTMLElement | null)
        ?? (iframeDoc.body as HTMLElement | null);
      if (!raiz) return;
      const folioCotizacion = this.folioCotizacionVisual();

      const elementosNoPrint = Array.from(raiz.querySelectorAll('.no-print')) as HTMLElement[];
      const estilosOriginales = elementosNoPrint.map((e) => e.style.display);
      elementosNoPrint.forEach((e) => e.style.display = 'none');

      const canvas = await html2canvas(raiz, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        allowTaint: false
      });

      elementosNoPrint.forEach((elemento, index) => {
        elemento.style.display = estilosOriginales[index] ?? '';
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const anchoPdf = pdf.internal.pageSize.getWidth();
      const altoPdf = pdf.internal.pageSize.getHeight();
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const altoImagenEscalada = (canvas.height * anchoPdf) / canvas.width;

      let restante = altoImagenEscalada;
      let offsetY = 0;

      pdf.addImage(imgData, 'JPEG', 0, offsetY, anchoPdf, altoImagenEscalada, undefined, 'FAST');
      restante -= altoPdf;

      while (restante > 0) {
        offsetY = restante - altoImagenEscalada;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, offsetY, anchoPdf, altoImagenEscalada, undefined, 'FAST');
        restante -= altoPdf;
      }

      pdf.save(`cotizacion-${folioCotizacion}.pdf`);

      cleanup();
    } catch {
      cleanup();
      throw new Error('No se pudo generar el PDF de la cotizacion.');
    }
  }

  private esperarCargaIframe(iframe: HTMLIFrameElement): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => reject(new Error('Tiempo de carga agotado.')), 45000);

      iframe.onload = () => {
        window.clearTimeout(timeoutId);
        resolve();
      };

      iframe.onerror = () => {
        window.clearTimeout(timeoutId);
        reject(new Error('Fallo al cargar la cotizacion.'));
      };
    });
  }

  private esperarImagenes(doc: Document): Promise<void> {
    const imgs = Array.from(doc.images);
    if (!imgs.length) return Promise.resolve();

    return Promise.all(
      imgs.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise<void>((resolve) => {
          const fin = () => resolve();
          img.addEventListener('load', fin, { once: true });
          img.addEventListener('error', fin, { once: true });
          window.setTimeout(fin, 6000);
        });
      })
    ).then(() => undefined);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

  estatusLabelDesdeSeleccion(selected: Condicione[] = [], datos: PoliticaHotel[] = []): string {
    if (!selected.length) return 'Selecciona condicion';
    const first = datos.find(e => e.id === selected[0].id);
    return first?.descripcion ?? 'Selecciona condicion';
  }

  obtenerPoliticasMesesPorTipo(tipoTarifa: string | null | undefined): PoliticaHotel[] {
    return tipoTarifa === 'apartado' ? this.politicasApartadoMeses : this.politicasNoReembolsableMeses;
  }

  habitacionCompleta(control: AbstractControl | null | undefined): boolean {
    if (!control) return false;

    const esComparativaHotel = Boolean(control.get('hotelId')?.value || String(control.get('hotelNombre')?.value ?? '').trim());
    const tipoHabitacion = this.normalizarTipoHabitacion(control.get('tipoHabitacion')?.value);
    if (!tipoHabitacion && !esComparativaHotel) return false;

    const secciones = [
      this.estadoSeccionNoReembolsable(control),
      this.estadoSeccionConSeguro(control),
      this.estadoSeccionMeses(control)
    ];

    const seccionesActivas = secciones.filter((seccion) => seccion.tieneDatos);
    if (!seccionesActivas.length) return false;

    return seccionesActivas.every((seccion) => seccion.completa);
  }

  estadoHabitacionTexto(control: AbstractControl | null | undefined): string {
    return this.habitacionCompleta(control) ? 'Completa' : 'X Incompleta';
  }

  habitacionesCompletas(): boolean {
    const habitaciones = [
      this.edicionForm,
      ...this.habitacionesAdicionales.controls
    ];

    return habitaciones.every((control) => this.habitacionCompleta(control));
  }

  private validarHabitacionesAntesDeGuardar(): boolean {
    if (this.habitacionesCompletas()) return true;

    this.edicionForm.markAllAsTouched();
    this.habitacionesAdicionales.controls.forEach((control) => control.markAllAsTouched());

    const indiceIncompleto = [
      this.edicionForm,
      ...this.habitacionesAdicionales.controls
    ].findIndex((control) => !this.habitacionCompleta(control));

    if (indiceIncompleto >= 0) {
      this.habitacionesPanelAbierto[indiceIncompleto] = true;
    }

    window.alert('Completa todas las habitaciones antes de guardar la cotización.');
    return false;
  }

  habitacionPanelAbierto(indice: number): boolean {
    return this.habitacionesPanelAbierto[indice] ?? indice === 0;
  }

  onHabitacionPanelToggle(indice: number, event: Event): void {
    const details = event.target as HTMLDetailsElement | null;
    this.habitacionesPanelAbierto[indice] = !!details?.open;
  }

  private crearHabitacionAdicionalForm(value?: Partial<CotizacionHabitacionForm>) {
    const form = this.fb.group({
      hotelId: [value?.hotelId ?? null],
      hotelNombre: [value?.hotelNombre ?? ''],
      regimenId: [value?.regimenId ?? null],
      regimen: [value?.regimen ?? ''],
      origenReservacionPrecio: [value?.origenReservacionPrecio ?? null],
      origenReservacionConSeguro: [value?.origenReservacionConSeguro ?? null],
      origenReservacionMeses: [value?.origenReservacionMeses ?? null],
      tipoHabitacion: [value?.tipoHabitacion ?? null, [Validators.required]],
      precio: [value?.precio ?? null],
      precioConSeguro: [value?.precioConSeguro ?? null],
      precioMeses: [value?.precioMeses ?? null],
      condicionesPrecioSinSeguro: this.fb.control<Condicione[]>(value?.condicionesPrecioSinSeguro ?? []),
      condicionesPrecioConSeguro: this.fb.control<Condicione[]>(value?.condicionesPrecioConSeguro ?? []),
      condicionesPrecioMeses: this.fb.control<Condicione[]>(value?.condicionesPrecioMeses ?? []),
      porcentajeSeguro: [value?.porcentajeSeguro ?? null],
      porcentajeMeses: [value?.porcentajeMeses ?? null],
      fechaLimiteSeguro: [value?.fechaLimiteSeguro ?? null],
      fechaLimiteMeses: [value?.fechaLimiteMeses ?? null],
      tipoTarifa: [value?.tipoTarifa ?? null]
    });

    form.get('tipoTarifa')?.valueChanges.subscribe(() => {
      form.patchValue({ condicionesPrecioMeses: [] }, { emitEvent: false });
    });

    return form;
  }

  private estadoSeccionNoReembolsable(control: AbstractControl) {
    const precio = this.obtenerNumeroLimpio(control.get('precio')?.value);
    const politicas = this.edicionForm.get('condicionesPrecioSinSeguro')?.value ?? [];
    const tieneDatos = precio !== null;
    return {
      tieneDatos,
      completa: precio !== null && politicas.length > 0
    };
  }

  private estadoSeccionConSeguro(control: AbstractControl) {
    const precio = this.obtenerNumeroLimpio(control.get('precioConSeguro')?.value);
    const politicas = control.get('condicionesPrecioConSeguro')?.value ?? [];
    const fecha = this.edicionForm.get('fechaLimiteSeguro')?.value ?? null;
    const tieneDatos = precio !== null;
    return {
      tieneDatos,
      completa: precio !== null && politicas.length > 0 && !!fecha
    };
  }

  private estadoSeccionMeses(control: AbstractControl) {
    const precio = this.obtenerNumeroLimpio(control.get('precioMeses')?.value);
    const politicas = control.get('condicionesPrecioMeses')?.value ?? [];
    const fecha = this.edicionForm.get('fechaLimiteMeses')?.value ?? null;
    const tipoTarifa = String(this.edicionForm.get('tipoTarifa')?.value ?? '').trim();
    const requiereFecha = tipoTarifa === 'apartado';
    const tieneDatos = precio !== null || politicas.length > 0 || !!fecha;
    return {
      tieneDatos,
      completa: precio !== null && politicas.length > 0 && (!requiereFecha || !!fecha)
    };
  }

  private inicializarPanelesHabitaciones(): void {
    const totalHabitaciones = 1 + this.habitacionesAdicionales.length;
    this.habitacionesPanelAbierto = Array.from({ length: totalHabitaciones }, (_, indice) => indice === 0);
    this.habitacionesPanelCompletasPrevias = Array.from({ length: totalHabitaciones }, (_, indice) =>
      this.habitacionCompleta(this.obtenerControlHabitacion(indice))
    );
  }

  private sincronizarAperturaSecuencialHabitaciones(): void {
    const totalHabitaciones = 1 + this.habitacionesAdicionales.length;
    if (!totalHabitaciones) return;

    if (this.habitacionesPanelAbierto.length !== totalHabitaciones) {
      const estadosPrevios = [...this.habitacionesPanelAbierto];
      this.habitacionesPanelAbierto = Array.from({ length: totalHabitaciones }, (_, indice) =>
        estadosPrevios[indice] ?? indice === 0
      );
    }

    if (this.habitacionesPanelCompletasPrevias.length !== totalHabitaciones) {
      const estadosPrevios = [...this.habitacionesPanelCompletasPrevias];
      this.habitacionesPanelCompletasPrevias = Array.from({ length: totalHabitaciones }, (_, indice) =>
        estadosPrevios[indice] ?? false
      );
    }

    for (let indice = 0; indice < totalHabitaciones; indice++) {
      const controlActual = this.obtenerControlHabitacion(indice);
      const completaActual = this.habitacionCompleta(controlActual);
      const completaAnterior = this.habitacionesPanelCompletasPrevias[indice] ?? false;

      if (!completaAnterior && completaActual) {
        const siguiente = indice + 1;
        if (siguiente < totalHabitaciones && !this.habitacionesPanelAbierto[siguiente]) {
          this.habitacionesPanelAbierto[siguiente] = true;
        }
      }
    }

    this.habitacionesPanelCompletasPrevias = Array.from({ length: totalHabitaciones }, (_, indice) =>
      this.habitacionCompleta(this.obtenerControlHabitacion(indice))
    );
  }

  private obtenerControlHabitacion(indice: number): AbstractControl | null {
    return indice === 0 ? this.edicionForm : this.habitacionesAdicionales.at(indice - 1);
  }

  private obtenerNumeroLimpio(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const cleaned = Number(String(value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(cleaned) ? cleaned : null;
  }

  private normalizarCondicionesPublicas(
    condiciones: Condicione[] | undefined,
    catalogo: PoliticaHotel[]
  ): Condicione[] {
    return (condiciones ?? []).map((condicion) => {
      const descripcionCatalogo = catalogo.find((item) => item.id === condicion.id)?.descripcion;
      return {
        ...condicion,
        descripcion: descripcionCatalogo ?? condicion.descripcion
      };
    });
  }

  private calcularMontoApartado(total: number | null, porcentaje: number | null): number | null {
    if (total === null) return null;
    if (porcentaje === null) return 0;
    return total * (porcentaje / 100);
  }

  private calcularMontoPendiente(total: number | null, apartado: number | null): number | null {
    if (total === null) return null;
    if (apartado === null) return total;
    return total - apartado;
  }

  private get cotizacionMultipleRespuesta(): CotizacionMultipleItem[] {
    const raw = this.informacionCotizacion?.cotizacion_multiple as any;
    if (!raw) return [];

    let parsed = raw;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        return [];
      }
    }

    return Array.isArray(parsed) ? parsed : [];
  }

  private obtenerNombreTipoHabitacion(tipoHabitacionId: number | null | undefined): string | null {
    if (tipoHabitacionId === null || tipoHabitacionId === undefined) return null;
    const tipo = this.tiposHabitacion.find((item) => Number(item.id) === Number(tipoHabitacionId));
    return tipo?.nombre_habitacion ?? null;
  }

  claveOrigenReservacion(origenId: number | null | undefined): string {
    const id = this.obtenerNumeroLimpio(origenId);
    if (id === null) return '';
    return this.origenReservacionOpciones.find((origen) => origen.id === id)?.clave ?? '';
  }

  claveOrigenCotizacion(campo: 'precio' | 'precioConSeguro' | 'precioMeses'): string {
    const primeraHabitacion = this.cotizacionMultipleRespuesta[0] as any;
    if (!primeraHabitacion) return '';

    const campoOrigen = campo === 'precio'
      ? 'origen_reservacion_precio_id'
      : campo === 'precioConSeguro'
        ? 'origen_reservacion_con_seguro_id'
        : 'origen_reservacion_meses_id';
    const campoAlterno = campo === 'precio'
      ? 'origenReservacionPrecio'
      : campo === 'precioConSeguro'
        ? 'origenReservacionConSeguro'
        : 'origenReservacionMeses';

    return this.claveOrigenReservacion(primeraHabitacion?.[campoOrigen] ?? primeraHabitacion?.[campoAlterno]);
  }

  private normalizarTipoHabitacion(value: unknown): TipoHabitacion | null {
    if (!value) return null;

    if (typeof value === 'object' && value !== null) {
      const candidate = value as Partial<TipoHabitacion> & { tipo_habitacion_id?: number | string | null };
      const id = candidate.id ?? candidate.tipo_habitacion_id ?? null;
      if (id !== null && id !== undefined && id !== '') {
        const byId = this.tiposHabitacion.find((tipo) => Number(tipo.id) === Number(id));
        if (byId) return byId;
      }

      const nombre = (candidate.nombre_habitacion ?? '').toString().trim();
      if (nombre) {
        const byNombre = this.tiposHabitacion.find(
          (tipo) => tipo.nombre_habitacion.trim().toLowerCase() === nombre.toLowerCase()
        );
        if (byNombre) return byNombre;
      }
      return null;
    }

    const raw = String(value).trim();
    if (!raw) return null;

    const numericId = Number(raw);
    if (Number.isFinite(numericId)) {
      const byId = this.tiposHabitacion.find((tipo) => Number(tipo.id) === numericId);
      if (byId) return byId;
    }

    return this.tiposHabitacion.find(
      (tipo) => tipo.nombre_habitacion.trim().toLowerCase() === raw.toLowerCase()
    ) ?? null;
  }

  private obtenerTotalHabitacionesCotizacion(): number {
    const habitacionesFuente = this.obtenerTextoHabitacionesCotizacion();
    const habitacionesDetectadas = this.obtenerDetalleHabitacionesPdf(habitacionesFuente);
    return Math.max(habitacionesDetectadas.length, 1);
  }

  private obtenerTotalHabitacionesVistaPublica(): number {
    const habitacionesFuente = this.obtenerTextoHabitacionesCotizacion();

    const habitacionesDetectadas = this.obtenerTotalHabitacionesCotizacion();
    const matchTotal = habitacionesFuente.match(/(\d+)\s*habitaci[oó]n(?:es)?/i);
    const totalTexto = matchTotal ? Number(matchTotal[1]) : 0;

    return Math.max(habitacionesDetectadas, Number.isFinite(totalTexto) ? totalTexto : 0, 1);
  }

  private normalizarCotizacionMultiple(raw: any): CotizacionHabitacionForm[] {
    let source = raw;
    if (typeof source === 'string') {
      try {
        source = JSON.parse(source);
      } catch {
        source = [];
      }
    }
    if (!Array.isArray(source)) return [];

    return source.map((item: any) => {
      const tipoHabitacionId =
        item?.tipo_habitacion_id ??
        item?.tipoHabitacionId ??
        item?.tipo_habitacion ??
        item?.tipoHabitacion?.id ??
        item?.tipoHabitacion ??
        null;
      const hotelId = item?.hotel_id ?? item?.hotelId ?? null;
      const hotelNombre = String(item?.hotel_nombre ?? item?.hotelNombre ?? '').trim();
      const tipoHabitacion = hotelId
        ? ({
          id: Number(hotelId) || 0,
          nombre_habitacion: hotelNombre || `Hotel ${hotelId}`,
          descripcion: '',
          capacidad_maxima: null
        } as any)
        : this.normalizarTipoHabitacion(tipoHabitacionId);

      return {
        hotelId,
        hotelNombre: hotelNombre || null,
        regimenId: item?.regimen_id ?? item?.regimenId ?? null,
        regimen: item?.regimen ?? null,
        origenReservacionPrecio: this.obtenerNumeroLimpio(
          item?.origen_reservacion_precio_id ?? item?.origenReservacionPrecio
        ),
        origenReservacionConSeguro: this.obtenerNumeroLimpio(
          item?.origen_reservacion_con_seguro_id ?? item?.origenReservacionConSeguro
        ),
        origenReservacionMeses: this.obtenerNumeroLimpio(
          item?.origen_reservacion_meses_id ?? item?.origenReservacionMeses
        ),
        tipoHabitacion,
        precio: this.obtenerNumeroLimpio(item?.precio),
        precioConSeguro: this.obtenerNumeroLimpio(item?.precio_con_seguro ?? item?.precioConSeguro),
        precioMeses: this.obtenerNumeroLimpio(item?.precio_a_meses ?? item?.precioMeses),
        condicionesPrecioSinSeguro: item?.condiciones_precio ?? item?.condicionesPrecioSinSeguro ?? [],
        condicionesPrecioConSeguro: item?.condiciones_precio_seguro ?? item?.condicionesPrecioConSeguro ?? [],
        condicionesPrecioMeses: item?.condiciones_precio_meses ?? item?.condicionesPrecioMeses ?? [],
        porcentajeSeguro: this.obtenerNumeroLimpio(item?.porcentaje_seguro ?? item?.porcentajeSeguro),
        porcentajeMeses: this.obtenerNumeroLimpio(item?.porcentaje_meses ?? item?.porcentajeMeses),
        fechaLimiteSeguro: this.parseLocalDate(item?.fecha_limite_seguro ?? item?.fechaLimiteSeguro),
        fechaLimiteMeses: this.parseLocalDate(item?.fecha_limite_meses ?? item?.fechaLimiteMeses),
        tipoTarifa: item?.tipo_tarifa ?? item?.tipoTarifa ?? null
      };
    });
  }

  private construirCotizacionMultipleEdicion(): void {
    const habitacionesEsperadas = this.obtenerTotalHabitacionesCotizacion();
    const desdeDb = this.normalizarCotizacionMultiple(this.informacionCotizacion?.cotizacion_multiple);
    const detalleHabitaciones = this.obtenerDetalleHabitacionesPdf(this.obtenerTextoHabitacionesCotizacion());
    const tipoHabitacionPrincipalAuto =
      this.obtenerTipoHabitacionAutomatica(detalleHabitaciones[0]) ??
      this.tiposHabitacion.find(item => item.id === this.informacionCotizacion.tipo_habitacion) ??
      null;

    const primeraHabitacionDb = desdeDb[0];
    const primeraHabitacion: CotizacionHabitacionForm = primeraHabitacionDb ? {
      ...primeraHabitacionDb,
      tipoHabitacion: primeraHabitacionDb.tipoHabitacion ?? tipoHabitacionPrincipalAuto
    } : {
      tipoHabitacion: tipoHabitacionPrincipalAuto,
      origenReservacionPrecio: null,
      origenReservacionConSeguro: null,
      origenReservacionMeses: null,
      precio: this.precioSinSeguro ? this.precioSinSeguro.precio : null,
      precioConSeguro: this.precioConSeguro ? this.precioConSeguro.precio : null,
      precioMeses: this.precioAMeses ? this.precioAMeses.precio : null,
      condicionesPrecioSinSeguro: this.precioSinSeguro ? this.precioSinSeguro.condiciones : [],
      condicionesPrecioConSeguro: this.precioConSeguro ? this.precioConSeguro.condiciones : [],
      condicionesPrecioMeses: this.precioAMeses ? this.precioAMeses.condiciones : [],
      porcentajeSeguro: this.informacionCotizacion.porcentaje_seguro,
      porcentajeMeses: this.informacionCotizacion.porcentaje_meses,
      fechaLimiteSeguro: this.parseLocalDate(this.informacionCotizacion.fecha_limite_seguro),
      fechaLimiteMeses: this.parseLocalDate(this.informacionCotizacion.fecha_limite_meses),
      tipoTarifa: this.edicionForm.get('tipoTarifa')?.value ?? null
    };

    this.edicionForm.patchValue({
      precio: primeraHabitacion.precio,
      precioConSeguro: primeraHabitacion.precioConSeguro,
      precioMeses: primeraHabitacion.precioMeses,
      origenReservacionPrecio: primeraHabitacion.origenReservacionPrecio,
      origenReservacionConSeguro: primeraHabitacion.origenReservacionConSeguro,
      origenReservacionMeses: primeraHabitacion.origenReservacionMeses,
      tipoHabitacion: primeraHabitacion.tipoHabitacion,
      condicionesPrecioSinSeguro: primeraHabitacion.condicionesPrecioSinSeguro,
      condicionesPrecioConSeguro: primeraHabitacion.condicionesPrecioConSeguro,
      condicionesPrecioMeses: primeraHabitacion.condicionesPrecioMeses,
      porcentajeSeguro: primeraHabitacion.porcentajeSeguro,
      porcentajeMeses: primeraHabitacion.porcentajeMeses,
      fechaLimiteSeguro: primeraHabitacion.fechaLimiteSeguro,
      fechaLimiteMeses: primeraHabitacion.fechaLimiteMeses,
      tipoTarifa: primeraHabitacion.tipoTarifa
    }, { emitEvent: false });

    this.habitacionesAdicionales.clear();

    const habitacionesAdicionalesDb = desdeDb.slice(1);
    const faltantes = Math.max(habitacionesEsperadas - 1, habitacionesAdicionalesDb.length);

    for (let i = 0; i < faltantes; i++) {
      const detalleHabitacion = detalleHabitaciones[i + 1];
      const valueDb = habitacionesAdicionalesDb[i];
      const value = valueDb ? {
        ...valueDb,
        tipoHabitacion: valueDb.tipoHabitacion ?? this.obtenerTipoHabitacionAutomatica(detalleHabitacion)
      } : {
        tipoHabitacion: this.obtenerTipoHabitacionAutomatica(detalleHabitacion),
        origenReservacionPrecio: null,
        origenReservacionConSeguro: null,
        origenReservacionMeses: null,
        precio: null,
        precioConSeguro: null,
        precioMeses: null,
        condicionesPrecioSinSeguro: [],
        condicionesPrecioConSeguro: [],
        condicionesPrecioMeses: [],
        porcentajeSeguro: null,
        porcentajeMeses: null,
        fechaLimiteSeguro: null,
        fechaLimiteMeses: null,
        tipoTarifa: null
      };
      this.habitacionesAdicionales.push(this.crearHabitacionAdicionalForm(value));
    }

    // Garantiza que cada control quede con objeto de tipo habitacion para que
    // el autocomplete muestre correctamente la seleccion guardada.
    this.habitacionesAdicionales.controls.forEach((control) => {
      const current = control.get('tipoHabitacion')?.value;
      const resolved = this.normalizarTipoHabitacion(current);
      if (resolved) {
        control.patchValue({ tipoHabitacion: resolved }, { emitEvent: false });
      }
    });

    this.inicializarPanelesHabitaciones();
  }

  private obtenerTipoHabitacionAutomatica(
    detalle?: DetalleHabitacionCotizacion
  ): TipoHabitacion | null {
    if (!detalle) return null;

    const capacidadRequerida = Number(detalle.adultos ?? 0) + Number(detalle.ninos ?? 0);
    if (!Number.isFinite(capacidadRequerida) || capacidadRequerida <= 0) return null;

    const tiposOrdenados = [...this.tiposHabitacion]
      .filter((item) => {
        const capacidad = Number(item.capacidad_maxima);
        return Number.isFinite(capacidad) && capacidad > 0;
      })
      .sort((a, b) => Number(a.capacidad_maxima) - Number(b.capacidad_maxima));

    if (!tiposOrdenados.length) return null;

    return (
      tiposOrdenados.find((item) => this.esTipoHabitacionCompatible(item, capacidadRequerida)) ??
      tiposOrdenados[tiposOrdenados.length - 1] ??
      null
    );
  }

  obtenerTiposHabitacionDisponibles(indiceHabitacion: number): TipoHabitacion[] {
    const detalle = this.obtenerDetalleHabitacionesEdicion()[indiceHabitacion];
    const capacidadRequerida = detalle
      ? Number(detalle.adultos ?? 0) + Number(detalle.ninos ?? 0)
      : 0;

    const tiposConCapacidad = this.tiposHabitacion.filter((item) => {
      const capacidad = Number(item.capacidad_maxima);
      return Number.isFinite(capacidad) && capacidad > 0;
    });

    if (!tiposConCapacidad.length || capacidadRequerida <= 0) {
      return this.tiposHabitacion;
    }

    return tiposConCapacidad
      .filter((item) => this.esTipoHabitacionCompatible(item, capacidadRequerida))
      .sort((a, b) => Number(a.capacidad_maxima) - Number(b.capacidad_maxima));
  }

  private obtenerDetalleHabitacionesEdicion(): DetalleHabitacionCotizacion[] {
    return this.obtenerDetalleHabitacionesPdf(this.obtenerTextoHabitacionesCotizacion());
  }

  private esTipoHabitacionCompatible(
    tipo: TipoHabitacion | null | undefined,
    capacidadRequerida: number
  ): boolean {
    if (!tipo) return false;
    const capacidad = Number(tipo.capacidad_maxima);
    return Number.isFinite(capacidad) && capacidad >= capacidadRequerida;
  }

  private obtenerCotizacionMultiple(): CotizacionMultipleItem[] {
    const primeraHabitacion = {
      tipoHabitacion: this.normalizarTipoHabitacion(this.edicionForm.get('tipoHabitacion')?.value),
      origenReservacionPrecio: this.obtenerNumeroLimpio(this.edicionForm.get('origenReservacionPrecio')?.value),
      origenReservacionConSeguro: this.obtenerNumeroLimpio(this.edicionForm.get('origenReservacionConSeguro')?.value),
      origenReservacionMeses: this.obtenerNumeroLimpio(this.edicionForm.get('origenReservacionMeses')?.value),
      precio: this.edicionForm.get('precio')?.value,
      precioConSeguro: this.edicionForm.get('precioConSeguro')?.value,
      precioMeses: this.edicionForm.get('precioMeses')?.value,
      condicionesPrecioSinSeguro: this.edicionForm.get('condicionesPrecioSinSeguro')?.value ?? [],
      condicionesPrecioConSeguro: this.edicionForm.get('condicionesPrecioConSeguro')?.value ?? [],
      condicionesPrecioMeses: this.edicionForm.get('condicionesPrecioMeses')?.value ?? [],
      porcentajeSeguro: this.edicionForm.get('porcentajeSeguro')?.value,
      porcentajeMeses: this.edicionForm.get('porcentajeMeses')?.value,
      fechaLimiteSeguro: this.edicionForm.get('fechaLimiteSeguro')?.value,
      fechaLimiteMeses: this.edicionForm.get('fechaLimiteMeses')?.value,
      tipoTarifa: this.edicionForm.get('tipoTarifa')?.value
    };

    const politicasSinSeguro = this.edicionForm.get('condicionesPrecioSinSeguro')?.value ?? [];
    const fechaLimiteSeguro = this.edicionForm.get('fechaLimiteSeguro')?.value;
    const fechaLimiteMeses = this.edicionForm.get('fechaLimiteMeses')?.value;
    const tipoTarifa = this.edicionForm.get('tipoTarifa')?.value;

    const habitaciones = [
      primeraHabitacion,
      ...this.habitacionesAdicionales.controls.map((control) => ({
        ...(control.value as CotizacionHabitacionForm),
        tipoHabitacion: this.normalizarTipoHabitacion(control.get('tipoHabitacion')?.value),
        condicionesPrecioSinSeguro: politicasSinSeguro,
        fechaLimiteSeguro,
        fechaLimiteMeses,
        tipoTarifa
      }))
    ];

    return habitaciones
      .map((item) => ({
        hotel_id: (item as any)?.hotelId ?? null,
        hotel_nombre: String((item as any)?.hotelNombre ?? '').trim() || null,
        regimen_id: (item as any)?.regimenId ?? null,
        regimen: String((item as any)?.regimen ?? '').trim() || null,
        tipo_habitacion_id: (item as any)?.hotelId ? null : item?.tipoHabitacion?.id ?? null,
        precio: this.obtenerNumeroLimpio(item?.precio),
        precio_con_seguro: this.obtenerNumeroLimpio(item?.precioConSeguro),
        precio_a_meses: this.obtenerNumeroLimpio(item?.precioMeses),
        condiciones_precio: item?.condicionesPrecioSinSeguro ?? [],
        condiciones_precio_seguro: item?.condicionesPrecioConSeguro ?? [],
        condiciones_precio_meses: (item?.condicionesPrecioMeses ?? []).map((condicion: Condicione) => ({
          ...condicion,
          tipoPoliticas: item?.tipoTarifa
        })),
        porcentaje_seguro: this.obtenerNumeroLimpio(item?.porcentajeSeguro),
        porcentaje_meses: this.obtenerNumeroLimpio(item?.porcentajeMeses),
        fecha_limite_seguro: this.formatearFechaParaDb(item?.fechaLimiteSeguro),
        fecha_limite_meses: this.formatearFechaParaDb(item?.fechaLimiteMeses),
        tipo_tarifa: item?.tipoTarifa ?? null,
        origen_reservacion_precio_id: this.obtenerNumeroLimpio(item?.origenReservacionPrecio),
        origen_reservacion_con_seguro_id: this.obtenerNumeroLimpio(item?.origenReservacionConSeguro),
        origen_reservacion_meses_id: this.obtenerNumeroLimpio(item?.origenReservacionMeses)
      }))
      .filter((item) =>
        item.tipo_habitacion_id !== null ||
        item.precio !== null ||
        item.precio_con_seguro !== null ||
        item.precio_a_meses !== null
      );
  }

  validacionesPreciosGuardados() {
    const { precios } = this.informacionCotizacion;
    this.precioSinSeguro = precios.find(o => o.tipo === 'sin_seguro') ?? null;
    this.precioConSeguro = precios.find(o => o.tipo === 'con_seguro') ?? null;
    this.precioAMeses = precios.find(o => o.tipo === 'a_meses') ?? null;

    this.precioSinSeguro?.condiciones.forEach(element => {
      element.descripcion = this.informacionCotizacion.politicas_tarifas.noReembolsable.find(item => item.id === element.id).descripcion
    });

    this.precioConSeguro?.condiciones.forEach(element => {
      element.descripcion = this.informacionCotizacion.politicas_tarifas.apartado.find(item => item.id === element.id).descripcion
    });

    this.precioAMeses?.condiciones.forEach(element => {
      element.descripcion = element.tipoPoliticas === 'apartado' ?
        this.informacionCotizacion.politicas_tarifas.apartado.find(item => item.id === element.id).descripcion :
        this.informacionCotizacion.politicas_tarifas.noReembolsable.find(item => item.id === element.id).descripcion;
    });

    if (this.esEdicion) {
      this.edicionForm.patchValue({
        estatus: this.estatusOpciones.find(
          item => item.nombre === this.informacionCotizacion.estatus
        )?.clave ?? '',
        condicionesPrecioSinSeguro: this.precioSinSeguro ? this.precioSinSeguro.condiciones : [],
        condicionesPrecioConSeguro: this.precioConSeguro ? this.precioConSeguro.condiciones : [],
        condicionesPrecioMeses: this.precioAMeses ? this.precioAMeses.condiciones : [],
        porcentajeSeguro: this.informacionCotizacion.porcentaje_seguro,
        porcentajeMeses: this.informacionCotizacion.porcentaje_meses,
        fechaLimiteSeguro: this.parseLocalDate(this.informacionCotizacion.fecha_limite_seguro),
        fechaLimiteMeses: this.parseLocalDate(this.informacionCotizacion.fecha_limite_meses),

      });
      this.construirCotizacionMultipleEdicion();
    }
  }


  async contactarAgente(tipo: 'sin_seguro' | 'con_seguro' | 'a_meses', total: string, link: string) {
    const label: Record<string, string> = {
      sin_seguro: 'opcion-sin-seguro',
      con_seguro: 'opcion-con-seguro',
      a_meses: 'opcion-a-meses',
    };
    const url = `https://www.trotapie.com/cotizacion/${this.informacionCotizacion.public_id}`

    const mensaje = await this.buildMensajeInteres(
      url,
      tipo,
      label
    );

    window.open(`https://wa.me/526188032003?text=${encodeURIComponent(mensaje)}`, '_blank');
  }


  calcularPagos(total: number, porcentajeApartado: number, campo: string) {
    const apartado = total * (porcentajeApartado / 100);
    const pagueDespues = total - apartado;

    if (campo === 'a_meses') {
      this.edicionForm.patchValue({
        pagueDespuesMeses: pagueDespues,
        cantidadMeses: apartado
      })
    } else if (campo === 'con_seguro') {
      this.edicionForm.patchValue({
        pagueDespuesApartado: pagueDespues,
        cantidadApartado: apartado
      })
    }
  }

  private parseLocalDate(dateStr: string | Date | null | undefined): Date | null {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;

    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  formatearRangoFechaCompacto(
    fechaEntrada: string | Date | null | undefined,
    fechaSalida: string | Date | null | undefined,
    idioma = 'es'
  ): string {
    const entrada = this.parseLocalDate(fechaEntrada);
    const salida = this.parseLocalDate(fechaSalida);

    if (!entrada || !salida) return '';

    const localeMap: Record<string, string> = {
      es: 'es-MX',
      en: 'en-US',
      pt: 'pt-BR',
      fr: 'fr-FR',
      de: 'de-DE'
    };

    const locale = localeMap[String(idioma).toLowerCase().trim().split('-')[0]] ?? 'es-MX';
    const mismoMes = entrada.getMonth() === salida.getMonth();
    const mismoAnio = entrada.getFullYear() === salida.getFullYear();
    const capitalizar = (valor: string): string => valor.charAt(0).toUpperCase() + valor.slice(1);

    const diaSemanaEntrada = capitalizar(new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(entrada));
    const diaSemanaSalida = capitalizar(new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(salida));
    const diaEntrada = new Intl.DateTimeFormat(locale, { day: '2-digit' }).format(entrada);
    const diaSalida = new Intl.DateTimeFormat(locale, { day: '2-digit' }).format(salida);

    if (mismoMes && mismoAnio) {
      const mes = new Intl.DateTimeFormat(locale, { month: 'long' }).format(salida);
      const anio = new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(salida);
      return `${diaSemanaEntrada} ${diaEntrada} - ${diaSemanaSalida} ${diaSalida} de ${mes} ${anio}`;
    }

    const fechaEntradaCompleta = capitalizar(
      new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        day: '2-digit',
        month: 'long',
        year: mismoAnio ? undefined : 'numeric'
      }).format(entrada)
    );

    const fechaSalidaCompleta = capitalizar(
      new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }).format(salida)
    );

    return `${fechaEntradaCompleta} - ${fechaSalidaCompleta}`;
  }

  private formatearFechaParaDb(value: unknown): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }


  private async buildMensajeCotizacionViaje(url: string): Promise<string> {
    const idiomaRaw = this.informacionCotizacion?.idioma || 'es';

    const idioma = idiomaRaw
      .toLowerCase()
      .trim()
      .split('-')[0];

    await firstValueFrom(this._translocoService.load(idioma));

    if (idioma !== 'es') {
      await firstValueFrom(this._translocoService.load('es'));
    }

    const msgIdioma = this._translocoService.translate(
      'mensaje-cotizacion-viaje',
      { url },
      idioma
    );

    if (idioma === 'es') return msgIdioma;

    const msgEs = this._translocoService.translate(
      'mensaje-cotizacion-viaje',
      { url },
      'es'
    );

    return [
      msgIdioma,
      '',
      '────────────',
      '',
      msgEs,
    ].join('\n');
  }

  private async buildMensajeInteres(
    url: string,
    tipo?: string,
    label?: Record<string, string>
  ): Promise<string> {

    const idioma = (this.informacionCotizacion?.idioma || 'es')
      .toLowerCase()
      .trim()
      .split('-')[0];

    await firstValueFrom(this._translocoService.load(idioma));

    if (idioma !== 'es') {
      await firstValueFrom(this._translocoService.load('es'));
    }

    const opcionTraducida = tipo
      ? this._translocoService.translate(label?.[tipo], {}, idioma)
      : '';

    const header = this._translocoService.translate(
      'mensaje-interes-cotizacion',
      { url },
      idioma
    );

    const body = tipo
      ? this._translocoService.translate(
        'mensaje-interes-opcion',
        { opcion: opcionTraducida },
        idioma
      )
      : this._translocoService.translate(
        'mensaje-interes-reserva',
        {},
        idioma
      );

    let mensaje = `${header}\n${body}`;

    if (idioma !== 'es') {

      const opcionEs = tipo
        ? this._translocoService.translate(label?.[tipo], {}, 'es')
        : '';

      const headerEs = this._translocoService.translate(
        'mensaje-interes-cotizacion',
        { url },
        'es'
      );

      const bodyEs = tipo
        ? this._translocoService.translate(
          'mensaje-interes-opcion',
          { opcion: opcionEs },
          'es'
        )
        : this._translocoService.translate(
          'mensaje-interes-reserva',
          {},
          'es'
        );

      mensaje = [
        mensaje,
        '',
        '────────────',
        '',
        `${headerEs}\n${bodyEs}`
      ].join('\n');
    }

    return mensaje;
  }
}

