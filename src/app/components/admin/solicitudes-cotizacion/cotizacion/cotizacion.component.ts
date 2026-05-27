import { Component, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SupabaseService } from 'app/core/supabase.service';
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
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { find } from 'lodash';

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
}

interface CotizacionHabitacionForm {
  tipoHabitacion: TipoHabitacion | null;
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
}

interface CountryDialCode {
  country: string;
  iso2: string;
  dialCode: string;
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
    descripcionCorreo: ['Adjunto encontrarás el PDF con el detalle completo de tu solicitud de cotización.'],
    incluirPreciosPdf: [true]
  });
  enviandoCorreoCotizacion = false;
  mensajeCorreoCotizacion = '';

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
  filteredOptions$: TipoHabitacion[] = [];

  precioSinSeguro: PreciosYCondiciones;
  precioConSeguro: PreciosYCondiciones;
  precioAMeses: PreciosYCondiciones;

  comparePolitica = (a: any, b: any) => a?.id === b?.id;
  compareTipoHabitacion = (a: TipoHabitacion | null, b: TipoHabitacion | null) => a?.id === b?.id;

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

      return {
        indice: idx + 1,
        tipoHabitacion: this.obtenerNombreTipoHabitacion(item?.tipo_habitacion_id),
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
        pagueDespuesMeses: this.calcularMontoPendiente(precioMeses, apartadoMeses)
      };
    });
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
        this.filteredOptions$ = this.tiposHabitacion.filter(m =>
          m.nombre_habitacion.toUpperCase().includes(texto.toUpperCase())
        );
      });

      this.edicionForm.get('tipoTarifa')?.valueChanges.subscribe(valor => {
        this.edicionForm.patchValue({
          condicionesPrecioMeses: []
        })
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
    this.estatusOpciones = estatus.data

    this.filteredOptions$ = this.tiposHabitacion = data;

  }

  private async cargarCatalogoTiposHabitacion() {
    if (this.tiposHabitacion?.length) return;
    const { data } = await this.supabase.tipoHabitaciones();
    this.tiposHabitacion = data ?? [];
    this.filteredOptions$ = this.tiposHabitacion;
  }

  private _filter(value: string): TipoHabitacion[] {
    const filterValue = value.toLowerCase().trim();
    return this.tiposHabitacion.filter(option =>
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

  get incluirPreciosPdfCtrl() {
    return this.telefonoForm.get('incluirPreciosPdf');
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

  setCampoPrecioActivo(campo: 'precio' | 'precioConSeguro' | 'precioMeses') {
    this.campoPrecioActivo = campo;
  }

  get totalEstanciaEdicion(): string | number | null {
    const camposActivos = this.obtenerCamposTarifaActivos();
    if (camposActivos.length !== 1) return null;
    return this.totalPorCampo(camposActivos[0]);
  }

  get mostrarTotalEstanciaEdicion(): boolean {
    return this.obtenerCamposTarifaActivos().length === 1;
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
    const incluirPreciosPdf = Boolean(this.incluirPreciosPdfCtrl?.value);

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
          descripcion,
          incluirPreciosPdf
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
    const url = `https://app.trotapie.com/cotizacion/${this.informacionCotizacion.public_id}`;

    const mensaje = await this.buildMensajeCotizacionViaje(url);
    const mensajeCodificado = encodeURIComponent(mensaje);
    const whatsappUrl = `https://wa.me/${lada}${telefonoLimpio}?text=${mensajeCodificado}`;

    window.open(whatsappUrl, '_blank');
  }

  private async enviarCotizacionCorreoInterno(
    correos: string[],
    asunto: string,
    descripcion: string,
    incluirPreciosPdf: boolean
  ): Promise<void> {
    await this.guardarCambiosAntesDeSalida();

    let pdfBase64: string | null = null;
    if (incluirPreciosPdf) {
      const pdf = await this.descargarPdfProformaCotizacion(this.informacionCotizacion.public_id, {
        descargar: false
      });
      const pdfDataUri = pdf.output('datauristring');
      pdfBase64 = pdfDataUri.includes(',') ? pdfDataUri.split(',')[1] : '';

      if (!pdfBase64) {
        throw new Error('No se pudo generar el PDF para adjuntar al correo.');
      }
    }

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
      mensaje: descripcion || null,
      pdf_base64: pdfBase64,
      pdf_filename: pdfBase64 ? `cotizacion-${this.informacionCotizacion.public_id}.pdf` : null
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

    const publicId = String(this.informacionCotizacion?.public_id ?? '').trim();
    if (publicId) {
      return `Cotizacion de viaje ${publicId}`;
    }

    return 'Cotizacion de viaje';
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
  ): Promise<jsPDF> {
    const cotizacion = this.informacionCotizacion;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 14;
    let y = margin;

    const pageBgColor: [number, number, number] = [244, 246, 250];
    const primaryColor: [number, number, number] = [15, 44, 77];
    const mainBoxColor: [number, number, number] = [11, 35, 64];
    const headerAccentColor: [number, number, number] = [255, 184, 28];
    const lightColor: [number, number, number] = [233, 239, 247];
    const textColor: [number, number, number] = [17, 34, 51];
    const mutedColor: [number, number, number] = [100, 116, 139];

    const paintPageBackground = (): void => {
      pdf.setFillColor(...pageBgColor);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    };

    paintPageBackground();

    const ensureSpace = (requiredHeight: number): void => {
      if (y + requiredHeight <= pageHeight - margin) return;
      pdf.addPage();
      paintPageBackground();
      y = margin;
    };

    const drawBlockTitle = (title: string): void => {
      ensureSpace(11);
      pdf.setFillColor(...lightColor);
      pdf.roundedRect(margin, y, pageWidth - margin * 2, 8.5, 1.6, 1.6, 'F');
      pdf.setTextColor(...primaryColor);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10.3);
      pdf.text(title, margin + 3, y + 5.8);
      y += 10.6;
    };

    const drawKeyValue = (label: string, value: string, x: number, yPos: number): number => {
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...mutedColor);
      pdf.setFontSize(8.8);
      pdf.text(label, x, yPos);

      const wrappedValue = pdf.splitTextToSize(value || '-', 200);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...textColor);
      pdf.setFontSize(9.6);
      pdf.text(wrappedValue, x, yPos + 4.3);

      return 4.3 + wrappedValue.length * 4.2;
    };

    const drawKeyValueWrapped = (
      label: string,
      value: string,
      x: number,
      yPos: number,
      maxWidth: number
    ): number => {
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...mutedColor);
      pdf.setFontSize(8.8);
      pdf.text(label, x, yPos);

      const wrappedValue = pdf.splitTextToSize(value || '-', maxWidth);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...textColor);
      pdf.setFontSize(9.6);
      pdf.text(wrappedValue, x, yPos + 4.3);

      return 4.3 + wrappedValue.length * 4.2;
    };

    const moneda = (valor?: number | null): string => {
      const numero = Number(valor ?? 0);
      if (!Number.isFinite(numero)) return 'MXN 0';
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

    const precios = cotizacion.precios ?? [];
    const precioSinSeguro = precios.find((p) => p.tipo === 'sin_seguro');
    const precioConSeguro = precios.find((p) => p.tipo === 'con_seguro');
    const precioMeses = precios.find((p) => p.tipo === 'a_meses');

    const opcionesPrecio = [
      {
        tipo: 'Tarifa sin seguro',
        precio: moneda(precioSinSeguro?.precio),
      },
      {
        tipo: 'Tarifa con seguro',
        precio: moneda(precioConSeguro?.precio),
      },
      {
        tipo: 'Tarifa a meses',
        precio: moneda(precioMeses?.precio),
      },
    ].filter((item) => item.precio !== moneda(0) || item.tipo === 'Tarifa sin seguro');

    const politicas = precios
      .flatMap((item) => item.condiciones ?? [])
      .map((item) => limpiar(item.descripcion))
      .filter((item, index, self) => item && self.indexOf(item) === index);

    const habitacionesFuente =
      limpiar(cotizacion?.habitaciones?.es) ||
      limpiar(cotizacion?.habitaciones?.traduccion);
    const detalleHabitaciones = this.obtenerDetalleHabitacionesPdf(habitacionesFuente);
    const habitacionesCotizacion = this.construirHabitacionesCotizacionVista();
    const regimenCotizacion = limpiar(cotizacion?.regimen) || '-';

    pdf.setFillColor(...mainBoxColor);
    pdf.roundedRect(margin, y, pageWidth - margin * 2, 26, 2.5, 2.5, 'F');
    pdf.setFillColor(...headerAccentColor);
    pdf.roundedRect(margin + 2.5, y + 23.8, pageWidth - margin * 2 - 5, 0.9, 0.3, 0.3, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('COTIZACION', margin + 4, y + 10);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    pdf.text(`Folio: ${publicId}`, margin + 4, y + 16);
    pdf.text(`ID cotizacion: ${cotizacion?.id ?? '-'}`, margin + 4, y + 22);
    pdf.text(`Fecha: ${fecha(cotizacion.fecha_creacion)}`, margin + 48, y + 22);

    const logoDataUrl = await this.obtenerImagenComoDataURL('/assets/images/logos/trotapie.png');
    if (logoDataUrl) {
      pdf.addImage(logoDataUrl, 'PNG', pageWidth - margin - 53, y + 4, 48, 18, undefined, 'FAST');
    }

    y += 33;

    drawBlockTitle('Datos del cliente');
    ensureSpace(34);
    const contentX = margin + 3;
    const contentW = pageWidth - margin * 2 - 6;
    const twoColGap = 8;
    const twoColW = (contentW - twoColGap) / 2;
    const sectionContentPadY = 3;
    y += sectionContentPadY;

    const nombreH = drawKeyValueWrapped(
      'Nombre',
      limpiar(cotizacion.cliente_nombre) || '-',
      contentX,
      y,
      twoColW
    );
    const correoH = drawKeyValueWrapped(
      'Correo',
      limpiar(cotizacion.cliente_email) || '-',
      contentX + twoColW + twoColGap,
      y,
      twoColW
    );
    y += Math.max(nombreH, correoH) + 4;

    const telefonoH = drawKeyValueWrapped(
      'Telefono',
      limpiar(cotizacion.cliente_telefono) || '-',
      contentX,
      y,
      contentW
    );
    y += telefonoH + 4 + sectionContentPadY;

    drawBlockTitle('Informacion de viaje');
    ensureSpace(44);
    y += sectionContentPadY;
    const destinoH = drawKeyValueWrapped(
      'Destino',
      limpiar(cotizacion.destino_nombre) || '-',
      contentX,
      y,
      twoColW
    );
    const estatusH = drawKeyValueWrapped(
      'Estatus',
      limpiar(cotizacion.estatus) || '-',
      contentX + twoColW + twoColGap,
      y,
      twoColW
    );
    y += Math.max(destinoH, estatusH) + 4;

    const hotelH = drawKeyValueWrapped(
      'Hotel',
      limpiar(cotizacion.nombre_hotel) || '-',
      contentX,
      y,
      contentW
    );
    y += hotelH + 4;

    const threeColGap = 6;
    const threeColW = (contentW - threeColGap * 2) / 3;
    const entradaH = drawKeyValueWrapped(
      'Entrada',
      fecha(cotizacion.fecha_entrada),
      contentX,
      y,
      threeColW
    );
    const salidaH = drawKeyValueWrapped(
      'Salida',
      fecha(cotizacion.fecha_salida),
      contentX + threeColW + threeColGap,
      y,
      threeColW
    );
    const nochesH = drawKeyValueWrapped(
      'Noches',
      `${cotizacion.noches ?? 0}`,
      contentX + (threeColW + threeColGap) * 2,
      y,
      threeColW
    );
    y += Math.max(entradaH, salidaH, nochesH) + 6 + sectionContentPadY;

        drawBlockTitle('Detalle por habitacion');
    if (!detalleHabitaciones.length && !habitacionesCotizacion.length) {
      ensureSpace(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...mutedColor);
      pdf.setFontSize(9.2);
      pdf.text('- Sin detalle de habitaciones', margin + 3, y + 4);
      y += 10;
    } else if (habitacionesCotizacion.length) {
      for (let i = 0; i < habitacionesCotizacion.length; i++) {
        const habitacion = habitacionesCotizacion[i];
        const detalleViajeros = detalleHabitaciones[i];

        const precioSinSeguroHabitacion =
          habitacion.precioSinSeguro ??
          (i === 0 ? this.obtenerNumeroLimpio(precioSinSeguro?.precio) : null);
        const precioConSeguroHabitacion =
          habitacion.precioConSeguro ??
          (i === 0 ? this.obtenerNumeroLimpio(precioConSeguro?.precio) : null);
        const precioMesesHabitacion =
          habitacion.precioMeses ??
          (i === 0 ? this.obtenerNumeroLimpio(precioMeses?.precio) : null);

        const viajeros = `${detalleViajeros?.adultos ?? 0} adulto(s), ${detalleViajeros?.ninos ?? 0} nino(s)`;
        const edades = limpiar(detalleViajeros?.extra);
        const tipoHabitacionTexto = limpiar(habitacion.tipoHabitacion) || '-';

        const opcionesHabitacion = [
          {
            nombre: 'Tarifa sin seguro',
            precio: precioSinSeguroHabitacion,
            condiciones: habitacion.condicionesSinSeguro,
            extra: ''
          },
          {
            nombre: 'Tarifa con seguro',
            precio: precioConSeguroHabitacion,
            condiciones: habitacion.condicionesConSeguro,
            extra:
              habitacion.apartadoSeguro !== null || habitacion.pagueDespuesSeguro !== null
                ? `Anticipo: ${moneda(habitacion.apartadoSeguro)} | Pendiente: ${moneda(habitacion.pagueDespuesSeguro)}`
                : ''
          },
          {
            nombre: 'Tarifa a meses',
            precio: precioMesesHabitacion,
            condiciones: habitacion.condicionesMeses,
            extra:
              habitacion.apartadoMeses !== null || habitacion.pagueDespuesMeses !== null
                ? `Anticipo: ${moneda(habitacion.apartadoMeses)} | Pendiente: ${moneda(habitacion.pagueDespuesMeses)}`
                : ''
          }
        ].filter((item) => item.precio !== null);

        const alturaOpcionesBase = opcionesHabitacion.reduce((acc, opcion) => {
          const lineasDescripcion = pdf.splitTextToSize(
            opcion.extra || '',
            pageWidth - margin * 2 - 20
          ).length;
          const totalCondiciones = opcion.condiciones?.length ?? 0;
          return acc + 6 + (lineasDescripcion > 1 ? (lineasDescripcion - 1) * 3.7 : 0) + totalCondiciones * 3.7;
        }, 0);
        const alturaBloque = 30 + Math.max(alturaOpcionesBase, 4);
        ensureSpace(alturaBloque + 4);

        pdf.setDrawColor(218, 226, 236);
        pdf.setFillColor(250, 252, 255);
        pdf.roundedRect(margin, y, pageWidth - margin * 2, alturaBloque, 2, 2, 'FD');

        let yBloque = y + 5;
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...primaryColor);
        pdf.setFontSize(10);
        pdf.text(`Habitacion ${habitacion.indice}`, margin + 3, yBloque);

        const metaY = yBloque + 4.2;
        const colGapHabitacion = 5;
        const colWHabitacion = (pageWidth - margin * 2 - 6 - colGapHabitacion * 2) / 3;
        const tipoH = drawKeyValueWrapped('Tipo de habitacion', tipoHabitacionTexto, margin + 3, metaY, colWHabitacion);
        const regimenH = drawKeyValueWrapped(
          'Regimen',
          regimenCotizacion,
          margin + 3 + colWHabitacion + colGapHabitacion,
          metaY,
          colWHabitacion
        );
        const viajerosH = drawKeyValueWrapped(
          'Viajeros',
          edades ? `${viajeros} (${edades})` : viajeros,
          margin + 3 + (colWHabitacion + colGapHabitacion) * 2,
          metaY,
          colWHabitacion
        );
        const metaBottom = metaY + Math.max(tipoH, regimenH, viajerosH);
        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin + 3, metaBottom + 1.4, pageWidth - margin - 3, metaBottom + 1.4);
        yBloque = metaBottom + 6;

        for (const opcion of opcionesHabitacion) {
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(...textColor);
          pdf.setFontSize(9.2);
          pdf.text(opcion.nombre, margin + 3, yBloque);
          pdf.text(moneda(opcion.precio), pageWidth - margin - 3, yBloque, { align: 'right' });
          yBloque += 4.4;

          if (opcion.extra) {
            const extraLineas = pdf.splitTextToSize(opcion.extra, pageWidth - margin * 2 - 20);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(...mutedColor);
            pdf.setFontSize(8.5);
            pdf.text(extraLineas, margin + 7, yBloque);
            yBloque += extraLineas.length * 3.7;
          }

          for (const condicion of opcion.condiciones ?? []) {
            const textoCondicion = limpiar(condicion?.descripcion);
            if (!textoCondicion) continue;
            const condLineas = pdf.splitTextToSize(`- ${textoCondicion}`, pageWidth - margin * 2 - 20);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(...mutedColor);
            pdf.setFontSize(8.5);
            pdf.text(condLineas, margin + 7, yBloque);
            yBloque += condLineas.length * 3.7;
          }

          yBloque += 1;
        }

        y += alturaBloque + 3;
      }
    } else {
      for (const detalle of detalleHabitaciones) {
        const bloque = `${detalle.habitacion}: ${detalle.adultos} adulto(s) - ${detalle.ninos} nino(s)`;
        const lineas = pdf.splitTextToSize(bloque, pageWidth - margin * 2 - 6);
        const alto = lineas.length * 4.6 + 2;
        ensureSpace(alto + 2);

        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...textColor);
        pdf.setFontSize(9.4);
        pdf.text(lineas, margin + 3, y + 4);

        if (detalle.extra) {
          const extraLineas = pdf.splitTextToSize(detalle.extra, pageWidth - margin * 2 - 10);
          const extraAlto = extraLineas.length * 4.3 + 1.5;
          ensureSpace(extraAlto + 2);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...mutedColor);
          pdf.setFontSize(8.8);
          pdf.text(extraLineas, margin + 7, y + alto + 1.8);
          y += alto + extraAlto + 2;
        } else {
          y += alto + 2;
        }
      }
    }

    if (!habitacionesCotizacion.length) {
      drawBlockTitle('Opciones de tarifa');
      ensureSpace(14);
      const tableX = margin;
      const tableW = pageWidth - margin * 2;
      const rowH = 8.5;
      const colTypeW = 108;

      pdf.setFillColor(...primaryColor);
      pdf.rect(tableX, y, tableW, rowH, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.3);
      pdf.text('Concepto', tableX + 3, y + 5.5);
      pdf.text('Precio', tableX + colTypeW + 3, y + 5.5);
      y += rowH;

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...textColor);
      opcionesPrecio.forEach((opcion, index) => {
        ensureSpace(rowH + 1);
        if (index % 2 === 0) {
          pdf.setFillColor(246, 248, 252);
          pdf.rect(tableX, y, tableW, rowH, 'F');
        }
        pdf.text(opcion.tipo, tableX + 3, y + 5.5);
        pdf.text(opcion.precio, tableX + colTypeW + 3, y + 5.5);
        y += rowH;
      });

      pdf.setDrawColor(208, 217, 230);
      pdf.rect(tableX, y - (rowH * (opcionesPrecio.length + 1)), tableW, rowH * (opcionesPrecio.length + 1));
      pdf.line(tableX + colTypeW, y - (rowH * (opcionesPrecio.length + 1)), tableX + colTypeW, y);
      y += 8;
    }

    drawBlockTitle('Politicas y condiciones');
    if (!politicas.length) {
      ensureSpace(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...mutedColor);
      pdf.setFontSize(9.2);
      pdf.text('- Sin politicas registradas', margin + 3, y + 4);
      y += 10;
    } else {
      pdf.setTextColor(...textColor);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9.2);
      for (const item of politicas) {
        const wrapped = pdf.splitTextToSize(`- ${item}`, pageWidth - margin * 2 - 6);
        const blockHeight = wrapped.length * 4.8 + 1.4;
        ensureSpace(blockHeight + 1);
        pdf.text(wrapped, margin + 3, y + 4);
        y += blockHeight;
      }
    }

    ensureSpace(22);
    pdf.setDrawColor(193, 204, 219);
    pdf.line(margin, y + 3, pageWidth - margin, y + 3);
    pdf.setTextColor(...mutedColor);
    pdf.setFontSize(8.8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Documento generado por Trotapie. Esta proforma no constituye confirmacion de reserva.', margin, y + 9);
    pdf.text(`URL de cotizacion: ${window.location.origin}/cotizacion/${publicId}`, margin, y + 14);

    if (options?.descargar !== false) {
      pdf.save(`cotizacion-${publicId}.pdf`);
    }

    return pdf;
  }

  private obtenerDetalleHabitacionesPdf(texto: string): Array<{
    habitacion: string;
    adultos: number;
    ninos: number;
    extra?: string;
  }> {
    if (!texto) return [];

    const lineas = texto
      .split(/\r?\n/)
      .map((linea) => linea.trim())
      .filter(Boolean);

    return lineas.map((linea, index) => {
      const habitacionMatch = linea.match(/habitaci[oó]n\s*(\d+)/i);
      const adultosMatch = linea.match(/(\d+)\s*adult(?:o|os)/i);
      const ninosMatch = linea.match(/(\d+)\s*ni(?:n|ñ)(?:o|os)/i);
      const extra = linea.includes(':') ? linea.split(':').slice(1).join(':').trim() : '';

      return {
        habitacion: habitacionMatch ? `Habitacion ${habitacionMatch[1]}` : `Habitacion ${index + 1}`,
        adultos: adultosMatch ? Number(adultosMatch[1]) : 0,
        ninos: ninosMatch ? Number(ninosMatch[1]) : 0,
        extra: extra || undefined,
      };
    });
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

      pdf.save(`cotizacion-${publicId}.pdf`);

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

  private crearHabitacionAdicionalForm(value?: Partial<CotizacionHabitacionForm>) {
    const form = this.fb.group({
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
    const habitacionesFuente =
      (this.informacionCotizacion?.habitaciones?.es ?? '').trim() ||
      (this.informacionCotizacion?.habitaciones?.traduccion ?? '').trim();
    const habitacionesDetectadas = this.obtenerDetalleHabitacionesPdf(habitacionesFuente);
    return Math.max(habitacionesDetectadas.length, 1);
  }

  private obtenerTotalHabitacionesVistaPublica(): number {
    const habitacionesFuente =
      (this.informacionCotizacion?.habitaciones?.es ?? '').trim() ||
      (this.informacionCotizacion?.habitaciones?.traduccion ?? '').trim();

    const habitacionesDetectadas = this.obtenerTotalHabitacionesCotizacion();
    const matchTotal = habitacionesFuente.match(/(\d+)\s*habitaci(?:o|ó)n(?:es)?/i);
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

      return {
        tipoHabitacion: this.normalizarTipoHabitacion(tipoHabitacionId),
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

    const primeraHabitacion: CotizacionHabitacionForm = desdeDb[0] ?? {
      tipoHabitacion: this.tiposHabitacion.find(
        item => item.id === this.informacionCotizacion.tipo_habitacion
      ) ?? null,
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
      const value = habitacionesAdicionalesDb[i] ?? {
        tipoHabitacion: null,
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
  }

  private obtenerCotizacionMultiple(): CotizacionMultipleItem[] {
    const tipoHabitacionPrincipal = this.normalizarTipoHabitacion(this.edicionForm.get('tipoHabitacion')?.value);

    const primeraHabitacion = {
      tipoHabitacion: tipoHabitacionPrincipal,
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

    const habitaciones = [
      primeraHabitacion,
      ...this.habitacionesAdicionales.controls.map((control) => ({
        ...(control.value as CotizacionHabitacionForm),
        tipoHabitacion: this.normalizarTipoHabitacion(control.get('tipoHabitacion')?.value)
      }))
    ];

    return habitaciones
      .map((item) => ({
        tipo_habitacion_id: item?.tipoHabitacion?.id ?? null,
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
        tipo_tarifa: item?.tipoTarifa ?? null
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
    const url = `https://app.trotapie.com/share/cotizacion/${this.informacionCotizacion.public_id}`

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
