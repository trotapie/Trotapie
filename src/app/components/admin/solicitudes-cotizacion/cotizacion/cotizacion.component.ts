import { Component, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SupabaseService } from 'app/core/supabase.service';
import { MaterialModule } from 'app/shared/material.module';
import { Condicione, ICotizacion, IEstatusCotizacion, PoliticaHotel, PreciosYCondiciones } from './cotizacion.interface';
import { DateI18nPipe } from 'app/core/i18n/date-i18n.pipe';
import { FormBuilder, Validators } from '@angular/forms';
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


interface TipoHabitacion {
  id: number;
  nombre_habitacion: string;
  descripcion: string;
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
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(15),
        Validators.pattern(/^[0-9]+$/) // solo números
      ]
    ],
    correo: ['', [Validators.email]]
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
    cantidadMeses: [null]
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

      } else {
        this.informacionCotizacion = await this.supabase.obtenerCotizacionPorPublicIdCliente(id);
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
        tipoTarifa: info?.condiciones[0].tipoPoliticas
      })
      this.politicas = info?.condiciones[0].tipoPoliticas === 'apartado' ? this.politicasApartado : this.politicasNoReembolsable;

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
      this.edicionForm.value
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
    const precio = this.edicionForm.get('precio')?.value;
    const precioConSeguro = this.edicionForm.get('precioConSeguro')?.value;
    const precioMeses = this.edicionForm.get('precioMeses')?.value;

    const valorActivo = ({
      precio,
      precioConSeguro,
      precioMeses
    } as const)[this.campoPrecioActivo];

    if (valorActivo !== null && valorActivo !== undefined && valorActivo !== '') {
      return valorActivo;
    }

    return [precio, precioConSeguro, precioMeses]
      .find(valor => valor !== null && valor !== undefined && valor !== '') ?? null;
  }

  soloNumeros(event: Event) {
    const input = event.target as HTMLInputElement;
    const limpio = input.value.replace(/\D/g, '');
    this.telefonoCtrl?.setValue(limpio, { emitEvent: false });
  }

  async sendCotizacion() {
    const telefono = this.telefonoForm.get('telefono')?.value ?? '';
    const telefonoLimpio = String(telefono).replace(/\D/g, '');
    const lada = String(this.ladaCtrl?.value ?? this.defaultDialCode).replace(/\D/g, '');
    const url = `https://app.trotapie.com/share/cotizacion/${this.informacionCotizacion.public_id}`

    const mensaje = await this.buildMensajeCotizacionViaje(url);
    const mensajeCodificado = encodeURIComponent(mensaje);

    const whatsappUrl = `https://wa.me/${lada}${telefonoLimpio}?text=${mensajeCodificado}`;

    window.open(whatsappUrl, '_blank');
    this.enviarCotizacion = false;
  }

  async enviarCotizacionCorreo() {
    const correo = String(this.correoCtrl?.value ?? '').trim();
    if (!correo || this.correoCtrl?.invalid) {
      this.correoCtrl?.markAsTouched();
      return;
    }
    if (!this.informacionCotizacion?.public_id) return;

    this.enviandoCorreoCotizacion = true;
    this.mensajeCorreoCotizacion = '';

    try {
      await this.guardarCambiosAntesDeSalida();

      const pdf = await this.descargarPdfProformaCotizacion(this.informacionCotizacion.public_id, {
        descargar: false
      });
      const pdfDataUri = pdf.output('datauristring');
      const pdfBase64 = pdfDataUri.includes(',') ? pdfDataUri.split(',')[1] : '';

      if (!pdfBase64) {
        throw new Error('No se pudo generar el PDF para adjuntar al correo.');
      }

      await this.supabase.enviarCorreoCotizacion({
        to_email: correo,
        to_name: this.informacionCotizacion?.cliente_nombre ?? '',
        hotel_nombre: this.informacionCotizacion?.nombre_hotel ?? '',
        fecha_entrada: this.informacionCotizacion?.fecha_entrada ?? null,
        fecha_salida: this.informacionCotizacion?.fecha_salida ?? null,
        noches: this.informacionCotizacion?.noches ?? null,
        telefono: this.telefonoCompleto(),
        public_id: this.informacionCotizacion?.public_id ?? null,
        pdf_base64: pdfBase64,
        pdf_filename: `cotizacion-${this.informacionCotizacion.public_id}.pdf`
      });

      this.mensajeCorreoCotizacion = `Cotizacion enviada por correo a ${correo}.`;
    } catch (error: any) {
      if (error?.message === 'COTIZACION_INVALIDA') {
        this.mensajeCorreoCotizacion = 'Completa los campos requeridos para guardar la cotizacion antes de enviar.';
        return;
      }
      this.mensajeCorreoCotizacion = error?.message ?? 'No se pudo enviar la cotizacion por correo.';
    } finally {
      this.enviandoCorreoCotizacion = false;
    }
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
    if (!detalleHabitaciones.length) {
      ensureSpace(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...mutedColor);
      pdf.setFontSize(9.2);
      pdf.text('- Sin detalle de habitaciones', margin + 3, y + 4);
      y += 10;
    } else {
      for (const detalle of detalleHabitaciones) {
        const bloque = `${detalle.habitacion}: ${detalle.adultos} adulto(s) · ${detalle.ninos} nino(s)`;
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

    drawBlockTitle('Opciones de tarifa');
    ensureSpace(14);
    const tableX = margin;
    const tableW = pageWidth - margin * 2;
    const rowH = 8.5;
    const colTypeW = 108;
    const colPriceW = tableW - colTypeW;

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
        porcentajeSeguro: this.informacionCotizacion.porcentaje_seguro,
        porcentajeMeses: this.informacionCotizacion.porcentaje_meses,
        fechaLimiteSeguro: this.parseLocalDate(this.informacionCotizacion.fecha_limite_seguro),
        fechaLimiteMeses: this.parseLocalDate(this.informacionCotizacion.fecha_limite_meses),

      });
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

  private parseLocalDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;

    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
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
