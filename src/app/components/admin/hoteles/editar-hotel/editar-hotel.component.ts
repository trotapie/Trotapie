import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';
import { MaterialModule } from 'app/shared/material.module';
import { TpInputComponent } from 'app/shared/tp-input/tp-input.component';
import { TpSelectSearchComponent, TpSelectSearchOption } from 'app/shared/tp-select-search/tp-select-search.component';
import { TpTextareaComponent } from 'app/shared/tp-textarea/tp-textarea.component';
import { TpSelectDirective } from 'app/shared/directives/tp-select.directive';
import { SupabaseService } from 'app/core/supabase.service';
import { DestinosService, DestinoCatalogo, PaisCatalogo, RegionCatalogo } from 'app/core/destinos.service';
import {
  FolderImageManagerComponent,
  FolderImageManagerFolder,
  FolderImageManagerImage,
  FolderImageManagerTypeOption
} from 'app/shared/folder-image-manager/folder-image-manager.component';

interface IDestinoAdmin {
  id: number;
  nombre: string;
  tipo_desino_id: number;
  destino_padre_id: number | null;
  continente_id?: number | null;
}

interface IDestinoCatalogoAdmin {
  id: number;
  nombre: string;
}

interface IRegimenAdmin {
  id: number;
  descripcion: string;
}

interface IActividadAdmin {
  id: number;
  descripcion: string;
  activo?: boolean;
}

interface ITipoHabitacionAdmin {
  id: number;
  nombre_habitacion: string;
  capacidad_maxima: number | null;
  descripcion: string;
}

interface IDescuentoAdmin {
  id: number;
  tipo_descuento: string;
}

interface ITipoImagenAdmin {
  id: number;
  clave: string;
  descripcion: string;
}

interface IIdiomaHotel {
  id: number;
  codigo: string;
  nombre: string;
}

interface ITraduccionHotelVista {
  nombre_hotel: string;
  descripcion: string;
}

interface IImagenEditable {
  key: string;
  id: number | null;
  url_imagen: string;
  tipo_imagen_id: number | null;
  eliminar?: boolean;
}

@Component({
  selector: 'app-editar-hotel',
  standalone: true,
  imports: [MaterialModule, FolderImageManagerComponent, TpInputComponent, TpSelectDirective, TpSelectSearchComponent, TpTextareaComponent],
  templateUrl: './editar-hotel.component.html',
  styleUrl: './editar-hotel.component.scss'
})
export class EditarHotelComponent implements OnInit, AfterViewInit, OnDestroy {
  private static readonly ZOOM_VISTA_CERCANA = 17;
  private static readonly DRIVE_IMAGENES_ENDPOINT =
    'https://script.google.com/macros/s/AKfycbwLioRXwoAhPfZMrHnlTPBfkMEaitAHrrkqbd6PFZdX9NoxNpTuZMW0OpzPdISheiTT/exec';
  private static readonly DRIVE_FONDO_ENDPOINT =
    'https://script.google.com/macros/s/AKfycbxpFsRZUQ__79EVqF07MWc_-UgymAQPtVcoxhU8uQ5jxeIldPRP2fkd09r6yK76zqu-uA/exec';
  private static readonly DRIVE_CARGA_CREACION_ENDPOINT =
    'https://script.google.com/macros/s/AKfycbwSHnOPFkhBq2YMRXwjyixD1-ZaKyChszLeZLRPTeZlvr2IXxkPWruOeJrn-bYduBT1/exec';
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);
  private readonly destinosService = inject(DestinosService);
  private readonly fb = inject(FormBuilder);
  @ViewChild('ubicacionMapPreview') private ubicacionMapElement?: ElementRef<HTMLDivElement>;
  private ubicacionSub?: Subscription;
  private mapaUbicacion?: L.Map;
  private marcadorUbicacion?: L.Marker;

  hotelId: number | null = null;
  esCreacion = false;
  cargando = true;
  cargandoDestinos = false;
  guardando = false;
  error = '';
  mostrarModalExito = false;
  mensajeModalExito = 'Hotel actualizado correctamente.';
  mostrarModalCambiosPendientes = false;
  mostrarModalActividadesSeleccionadas = false;
  mostrarModalEliminarImagenesSeleccionadas = false;
  mostrarModalEditarImagen = false;
  mostrarModalAsignarTipoImagenes = false;

  destinos: IDestinoAdmin[] = [];
  destinosCatalogo: IDestinoCatalogoAdmin[] = [];
  regionesInternacionales: RegionCatalogo[] = [];
  paisesInternacionales: PaisCatalogo[] = [];
  destinosInternacionales: DestinoCatalogo[] = [];
  regimenes: IRegimenAdmin[] = [];
  actividades: IActividadAdmin[] = [];
  tiposHabitacion: ITipoHabitacionAdmin[] = [];
  descuentos: IDescuentoAdmin[] = [];
  tiposImagen: ITipoImagenAdmin[] = [];
  idiomas: IIdiomaHotel[] = [];

  filtroRegimenes = '';
  filtroActividades = '';
  filtroTiposHabitacion = '';
  imagenes: IImagenEditable[] = [];
  imagenesEliminadasPendientes: IImagenEditable[] = [];
  imagenesSeleccionadas = new Set<string>();
  imagenSeleccionadaKey: string | null = null;
  imagenEditandoKey: string | null = null;
  urlImagenEditando = '';
  tipoImagenEdicionId: number | null = null;
  tipoImagenMasivoId: number | null = null;
  imagenesParaAsignarTipo = new Set<string>();
  reinicioSeleccionGaleria = 0;
  traduciendoContenido = false;
  mostrarModalAgregarImagenes = false;
  esModalFondoDesdeDrive = false;
  esModalCargaDriveCreacion = false;
  urlFondoLote = '';
  urlsImagenesLote = '';
  urlDriveLote = '';
  consultandoImagenesDrive = false;
  private snapshotEstadoInicial = '';

  regimenesSeleccionados = new Set<number>();
  actividadesSeleccionadas = new Set<number>();
  tiposHabitacionSeleccionados = new Set<number>();
  actividadesSeleccionadasDetalleMap = new Map<number, string>();
  ultimaLlaveTraduccionHotel = '';
  concentradoTraduccionesHotel: Record<string, { nombre: string; descripcion: string }> = {};
  traduccionesHotelExistentes = new Map<number, { nombre_hotel: string | null; descripcion: string | null }>();
  coordenadasUbicacion: { lat: number; lng: number } | null = null;

  form = this.fb.group({
    nombre_hotel: ['', [Validators.required]],
    orden: [null as number | null, [Validators.min(0)]],
    descripcion: [''],
    fondo: [''],
    descuento_id: [null as number | null],
    destino_id: [null as number | null],
    continente_id: [null as number | null],
    pais_id: [null as number | null],
    catalogo_destino_id: [{ value: null as number | null, disabled: true }],
    tipo_catalogo: [null as 'NACIONAL' | 'INTERNACIONAL' | null],
    estrellas: [null as number | null, [Validators.min(0), Validators.max(5)]],
    ubicacion: [''],
    regimen_principal_id: [null as number | null]
  });

  get tieneCambiosPendientes(): boolean {
    if (!this.snapshotEstadoInicial || this.cargando) {
      return false;
    }

    return this.serializarEstadoActual() !== this.snapshotEstadoInicial;
  }

  get puedeGuardar(): boolean {
    if (this.guardando || this.form.invalid) {
      return false;
    }

    const destinoId = Number(this.form.get('destino_id')?.value);
    const catalogoDestinoId = Number(this.form.get('catalogo_destino_id')?.value);
    return this.esCreacion
      ? Number.isFinite(catalogoDestinoId)
      : Number.isFinite(destinoId) || Number.isFinite(catalogoDestinoId);
  }

  get estrellasSeleccionadas(): number {
    const valor = Number(this.form.get('estrellas')?.value);
    return Number.isFinite(valor) ? Math.min(5, Math.max(0, Math.round(valor * 2) / 2)) : 0;
  }

  get estrellasConstelacion(): Array<{ indice: number; tipo: 'full' | 'half'; clave: string }> {
    const completas = Math.floor(this.estrellasSeleccionadas);
    const estrellas: Array<{ indice: number; tipo: 'full' | 'half'; clave: string }> = Array.from({ length: completas }, (_, index) => ({
      indice: index + 1,
      tipo: 'full' as const,
      clave: `${index + 1}-full`
    }));

    if (this.estrellasSeleccionadas % 1 >= 0.5) {
      const indice = completas + 1;
      estrellas.push({ indice, tipo: 'half', clave: `${indice}-half` });
    }

    return estrellas;
  }

  desplazarASeccion(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  ngAfterViewInit(): void {
    this.actualizarPreviewUbicacion();
  }

  async ngOnInit() {
    const idRaw = (this.route.snapshot.paramMap.get('id') ?? '').trim();
    this.esCreacion = idRaw.toLowerCase() === 'nuevo';
    this.ubicacionSub = this.form.get('ubicacion')?.valueChanges.subscribe(() => {
      this.actualizarPreviewUbicacion();
    });

    try {
      const [destinos, regimenes, actividades, descuentos, tiposImagen, idiomas, tiposHabitacion] = await Promise.all([
        this.supabase.obtenerDestinosAdmin(),
        this.supabase.obtenerRegimenesAdmin(),
        this.supabase.obtenerActividadesAdmin(),
        this.supabase.obtenerDescuentosAdmin(),
        this.supabase.obtenerTiposImagenAdmin(),
        this.supabase.obtenerIdiomasPreviewAdmin(),
        this.supabase.obtenerTiposHabitacionAdmin()
      ]);

      this.destinos = (destinos ?? []) as IDestinoAdmin[];
      this.regimenes = (regimenes ?? []) as IRegimenAdmin[];
      this.actividades = (actividades ?? [])
        .map((item: any) => ({
          ...item,
          id: Number(item?.id)
        }))
        .filter((item: IActividadAdmin) => Number.isFinite(item.id)) as IActividadAdmin[];
      this.descuentos = (descuentos ?? [])
        .map((item: any) => ({
          ...item,
          id: Number(item?.id)
        }))
        .filter((item: IDescuentoAdmin) => Number.isFinite(item.id)) as IDescuentoAdmin[];
      this.tiposImagen = (tiposImagen ?? []) as ITipoImagenAdmin[];
      this.idiomas = (idiomas ?? []) as IIdiomaHotel[];
      this.tiposHabitacion = (tiposHabitacion ?? []) as ITipoHabitacionAdmin[];

      if (this.esCreacion) {
        this.configurarValidacionesCreacion();
        this.actualizarPreviewUbicacion();
        this.marcarEstadoGuardado();
        return;
      }

      const id = Number(idRaw);
      if (!Number.isFinite(id)) {
        throw new Error('No se encontro el hotel a editar.');
      }

      this.hotelId = id;
      const detalleHotel = await this.supabase.infoHotel(this.hotelId, 'es');
      if (!detalleHotel) {
        throw new Error('No se encontro el hotel solicitado.');
      }

      const tipoCatalogo = (this.route.snapshot.queryParamMap.get('tipo') ?? '').toUpperCase();
      if (tipoCatalogo === 'NACIONAL' || tipoCatalogo === 'INTERNACIONAL') {
        await this.cambiarTipoCatalogo(tipoCatalogo);
      }

      this.form.patchValue({
        nombre_hotel: detalleHotel.nombre_hotel ?? '',
        orden: detalleHotel.orden ?? null,
        descripcion: detalleHotel.descripcion ?? '',
        fondo: detalleHotel.fondo ?? '',
        descuento_id: this.parseNumber(detalleHotel.descuento_id),
        destino_id: detalleHotel.destino_id ?? null,
        catalogo_destino_id: this.parseNumber(detalleHotel.catalogo_destino_id),
        estrellas: detalleHotel.estrellas ?? null,
        ubicacion: detalleHotel.ubicacion ?? '',
        regimen_principal_id: detalleHotel.regimen_id ?? null
      });

      if (tipoCatalogo === 'INTERNACIONAL') {
        await this.restaurarUbicacionInternacional(this.parseNumber(detalleHotel.catalogo_destino_id));
      }

      const regimenIds = (detalleHotel.regimenes ?? []).map((item: any) => Number(item.id)).filter((id: number) => Number.isFinite(id));
      const actividadesDetalle = (detalleHotel.actividades ?? [])
        .map((item: any) => ({
          id: Number(item?.id),
          descripcion: String(item?.descripcion ?? '').trim()
        }))
        .filter((item: { id: number; descripcion: string }) => Number.isFinite(item.id));
      const actividadIds = actividadesDetalle.map((item: { id: number; descripcion: string }) => item.id);

      regimenIds.forEach((idRegimen: number) => this.regimenesSeleccionados.add(idRegimen));
      actividadIds.forEach((idActividad: number) => this.actividadesSeleccionadas.add(idActividad));
      (detalleHotel.tipos_habitacion_ids ?? []).forEach((tipoId: unknown) => {
        const idTipo = Number(tipoId);
        if (Number.isFinite(idTipo)) this.tiposHabitacionSeleccionados.add(idTipo);
      });
      actividadesDetalle.forEach((actividad: { id: number; descripcion: string }) => {
        const fallbackDescripcion = actividad.descripcion || `Actividad #${actividad.id}`;
        this.actividadesSeleccionadasDetalleMap.set(actividad.id, fallbackDescripcion);
      });

      const regimenPrincipalId = Number(detalleHotel.regimen_id);
      if (Number.isFinite(regimenPrincipalId) && regimenPrincipalId > 0) {
        this.regimenesSeleccionados.add(regimenPrincipalId);
      }

      this.imagenes = (detalleHotel.imagenes ?? []).map((item: any, index: number) => ({
        key: `${item.id ?? 'nuevo'}-${index}`,
        id: this.parseNumber(item.id),
        url_imagen: item.url_imagen ?? '',
        tipo_imagen_id: item.tipo_imagen_id ?? null,
        eliminar: false
      }));
      this.imagenesEliminadasPendientes = [];
      this.imagenesSeleccionadas.clear();

      (detalleHotel.traducciones ?? []).forEach((item: any) => {
        const idiomaId = Number(item.idioma_id);
        if (!Number.isFinite(idiomaId)) return;

        this.traduccionesHotelExistentes.set(idiomaId, {
          nombre_hotel: item.nombre_hotel ?? null,
          descripcion: item.descripcion ?? null
        });
      });
      this.actualizarPreviewUbicacion();
      this.marcarEstadoGuardado();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo cargar la informacion del hotel.';
    } finally {
      this.cargando = false;
    }
  }

  ngOnDestroy(): void {
    this.ubicacionSub?.unsubscribe();
    this.destruirMapaUbicacion();
  }

  @HostListener('window:beforeunload', ['$event'])
  handleBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.tieneCambiosPendientes || this.guardando) {
      return;
    }

    const mensaje = 'Tienes cambios pendientes. ¿Quieres salir sin guardar?';
    event.preventDefault();
    event.returnValue = mensaje;
  }

  get regimenesFiltrados(): IRegimenAdmin[] {
    const filtro = this.filtroRegimenes.trim().toLowerCase();
    if (!filtro) return this.regimenes;
    return this.regimenes.filter((item) => item.descripcion.toLowerCase().includes(filtro));
  }

  get actividadesFiltradas(): IActividadAdmin[] {
    const filtro = this.filtroActividades.trim().toLowerCase();
    if (!filtro) return this.actividades;
    return this.actividades.filter((item) => item.descripcion.toLowerCase().includes(filtro));
  }

  get tiposHabitacionFiltrados(): ITipoHabitacionAdmin[] {
    const filtro = this.filtroTiposHabitacion.trim().toLowerCase();
    if (!filtro) return this.tiposHabitacion;
    return this.tiposHabitacion.filter((item) =>
      item.nombre_habitacion.toLowerCase().includes(filtro) ||
      item.descripcion.toLowerCase().includes(filtro)
    );
  }

  get totalRegimenesSeleccionados(): number {
    return this.regimenesSeleccionados.size;
  }

  get totalActividadesSeleccionadas(): number {
    return this.actividadesSeleccionadas.size;
  }

  get totalTiposHabitacionSeleccionados(): number {
    return this.tiposHabitacionSeleccionados.size;
  }

  get actividadesSeleccionadasDetalle(): IActividadAdmin[] {
    if (!this.actividadesSeleccionadas.size) {
      return [];
    }

    return Array.from(this.actividadesSeleccionadas.values())
      .map((id) => ({
        id,
        descripcion:
          this.actividades.find((actividad) => Number(actividad.id) === id)?.descripcion ??
          this.actividadesSeleccionadasDetalleMap.get(id) ??
          `Actividad #${id}`
      }))
      .sort((a, b) => a.descripcion.localeCompare(b.descripcion));
  }

  esRegimenSeleccionado(regimenId: number): boolean {
    return this.regimenesSeleccionados.has(regimenId);
  }

  esActividadSeleccionada(actividadId: number): boolean {
    const id = Number(actividadId);
    return Number.isFinite(id) && this.actividadesSeleccionadas.has(id);
  }

  esTipoHabitacionSeleccionado(tipoHabitacionId: number): boolean {
    return this.tiposHabitacionSeleccionados.has(Number(tipoHabitacionId));
  }

  toggleRegimen(regimenId: number, checked: boolean) {
    const id = Number(regimenId);
    if (!Number.isFinite(id)) {
      return;
    }

    if (checked) {
      this.regimenesSeleccionados.add(id);
      this.sincronizarRegimenPrincipalEnCreacion();
      return;
    }

    this.regimenesSeleccionados.delete(id);

    if (Number(this.form.get('regimen_principal_id')?.value) === id) {
      this.form.patchValue({ regimen_principal_id: null });
    }

    this.sincronizarRegimenPrincipalEnCreacion();
  }

  toggleActividad(actividadId: number, checked: boolean) {
    const id = Number(actividadId);
    if (!Number.isFinite(id)) {
      return;
    }

    if (checked) {
      this.actividadesSeleccionadas.add(id);
      const descripcion = this.actividades.find((item) => Number(item.id) === id)?.descripcion;
      this.actividadesSeleccionadasDetalleMap.set(id, descripcion ?? `Actividad #${id}`);
      return;
    }

    this.actividadesSeleccionadas.delete(id);
    this.actividadesSeleccionadasDetalleMap.delete(id);
  }

  toggleTipoHabitacion(tipoHabitacionId: number, checked: boolean): void {
    const id = Number(tipoHabitacionId);
    if (!Number.isFinite(id)) return;
    if (checked) {
      this.tiposHabitacionSeleccionados.add(id);
      return;
    }
    this.tiposHabitacionSeleccionados.delete(id);
  }

  onRegimenPrincipalChange(regimenId: number | string | null) {
    const id = this.parseNumber(regimenId);
    this.form.patchValue(
      {
        regimen_principal_id: id
      },
      { emitEvent: false }
    );

    if (id) {
      this.regimenesSeleccionados.add(id);
      this.sincronizarRegimenPrincipalEnCreacion();
    }
  }

  private sincronizarRegimenPrincipalEnCreacion(): void {
    if (!this.esCreacion) {
      return;
    }

    const regimenes = Array.from(this.regimenesSeleccionados.values());
    if (regimenes.length === 1) {
      this.form.patchValue(
        {
          regimen_principal_id: regimenes[0]
        },
        { emitEvent: false }
      );
    }
  }

  onDescuentoChange(descuentoId: number | string | null) {
    this.form.patchValue(
      {
        descuento_id: this.parseNumber(descuentoId)
      },
      { emitEvent: false }
    );
  }

  abrirModalAgregarImagenes() {
    this.esModalFondoDesdeDrive = false;
    this.esModalCargaDriveCreacion = false;
    this.urlFondoLote = '';
    this.urlsImagenesLote = '';
    this.urlDriveLote = '';
    this.consultandoImagenesDrive = false;
    this.mostrarModalAgregarImagenes = true;
  }

  abrirModalAgregarFondoDesdeDrive() {
    this.esModalFondoDesdeDrive = true;
    this.esModalCargaDriveCreacion = false;
    this.urlFondoLote = '';
    this.urlsImagenesLote = '';
    this.urlDriveLote = '';
    this.consultandoImagenesDrive = false;
    this.mostrarModalAgregarImagenes = true;
  }

  abrirModalCargaImagenesDriveCreacion() {
    this.error = '';
    this.esModalFondoDesdeDrive = false;
    this.esModalCargaDriveCreacion = true;
    this.urlFondoLote = (this.form.get('fondo')?.value ?? '').toString().trim();
    this.urlsImagenesLote = this.formatearUrlsComoLista(this.imagenes.map((item) => item.url_imagen));
    this.urlDriveLote = '';
    this.consultandoImagenesDrive = false;
    this.mostrarModalAgregarImagenes = true;
  }

  cerrarModalAgregarImagenes() {
    this.esModalFondoDesdeDrive = false;
    this.esModalCargaDriveCreacion = false;
    this.urlFondoLote = '';
    this.consultandoImagenesDrive = false;
    this.mostrarModalAgregarImagenes = false;
  }

  async agregarImagenesDesdeModal() {
    const urls = this.extraerUrlsDesdeTextoLote(this.urlsImagenesLote ?? '')
      .map((url) => (url ?? '').trim())
      .filter((url) => /^https?:\/\//i.test(url))
      .filter((url, index, arr) => arr.indexOf(url) === index);

    if (!urls.length) {
      this.error = 'Ingresa al menos una URL valida (una por linea o arreglo JSON).';
      return;
    }

    if (this.esModalFondoDesdeDrive) {
      if (urls.length !== 1) {
        this.error = 'Para fondo solo se permite una URL de imagen.';
        return;
      }

      this.form.patchValue({ fondo: urls[0] });
      this.error = '';
      this.cerrarModalAgregarImagenes();
      return;
    }

    if (this.esModalCargaDriveCreacion) {
      const fondoUrl = (this.urlFondoLote ?? '').trim();
      const tieneFondoValido = /^https?:\/\//i.test(fondoUrl);

      if (!tieneFondoValido && !urls.length) {
        this.error = 'Agrega una URL valida de fondo o al menos una imagen.';
        return;
      }

      if (tieneFondoValido) {
        this.form.patchValue({ fondo: fondoUrl });
      }

      this.imagenes = urls.map((url, index) => ({
        key: `nuevo-${Date.now()}-${index + 1}`,
        id: null,
        url_imagen: url,
        tipo_imagen_id: null,
        eliminar: false
      }));
      this.imagenesEliminadasPendientes = [];
      this.imagenesSeleccionadas.clear();

      this.error = '';
      this.cerrarModalAgregarImagenes();
      return;
    }

    const nuevasImagenes: IImagenEditable[] = urls.map((url, index) => ({
      key: `nuevo-${Date.now()}-${this.imagenes.length + index + 1}`,
      id: null,
      url_imagen: url,
      tipo_imagen_id: null,
      eliminar: false
    }));

    this.imagenes = [...this.imagenes, ...nuevasImagenes];
    this.imagenesSeleccionadas.clear();
    this.error = '';
    this.cerrarModalAgregarImagenes();
  }

  async consultarImagenesDriveDesdeModal() {
    const carpetaId = this.extraerIdCarpetaDrive(this.urlDriveLote ?? '');

    if (!carpetaId) {
      this.error = 'La URL de Drive no es valida. Verifica que incluya una carpeta.';
      return;
    }

    this.consultandoImagenesDrive = true;
    try {
      if (this.esModalCargaDriveCreacion) {
        const resultado = await this.obtenerCargaDriveCreacionHotel(carpetaId);
        const urlsUnificadas = [
          ...this.extraerUrlsDesdeTextoLote(this.urlsImagenesLote ?? ''),
          ...resultado.imagenes
        ]
          .map((url) => (url ?? '').trim())
          .filter((url) => /^https?:\/\//i.test(url))
          .filter((url, index, arr) => arr.indexOf(url) === index);

        this.urlFondoLote = resultado.fondo;
        this.urlsImagenesLote = this.formatearUrlsComoLista(urlsUnificadas);

        if (!this.urlFondoLote && !urlsUnificadas.length) {
          this.error = 'No se encontraron imagenes en esa carpeta de Drive.';
          return;
        }

        this.error = '';
        return;
      }

      const endpoint = this.esModalFondoDesdeDrive
        ? EditarHotelComponent.DRIVE_FONDO_ENDPOINT
        : EditarHotelComponent.DRIVE_IMAGENES_ENDPOINT;
      const urlsDrive = await this.obtenerImagenesHotel(carpetaId, endpoint);
      if (!urlsDrive.length) {
        this.error = 'No se encontraron imagenes en esa carpeta de Drive.';
        return;
      }

      const urlsActuales = this.extraerUrlsDesdeTextoLote(this.urlsImagenesLote ?? '');
      const urlsUnificadas = [...urlsActuales, ...urlsDrive]
        .map((url) => (url ?? '').trim())
        .filter((url) => /^https?:\/\//i.test(url))
        .filter((url, index, arr) => arr.indexOf(url) === index);

      if (this.esModalFondoDesdeDrive) {
        const fondoUrl = urlsUnificadas[0] ?? '';
        if (!fondoUrl) {
          this.error = 'No se encontro una URL valida para el fondo.';
          return;
        }

        this.form.patchValue({ fondo: fondoUrl });
        this.urlsImagenesLote = fondoUrl;
        this.error = '';
        this.cerrarModalAgregarImagenes();
        return;
      } else {
        this.urlsImagenesLote = this.formatearUrlsComoLista(urlsUnificadas);
      }
      this.error = '';
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron obtener las imagenes desde Drive.';
    } finally {
      this.consultandoImagenesDrive = false;
    }
  }

  get tieneUrlsImagenesLoteValidas(): boolean {
    return this.extraerUrlsDesdeTextoLote(this.urlsImagenesLote ?? '').length > 0;
  }

  get puedeConfirmarModalAgregarImagenes(): boolean {
    if (this.esModalCargaDriveCreacion) {
      const total = this.extraerUrlsDesdeTextoLote(this.urlsImagenesLote ?? '').length;
      const fondoValido = /^https?:\/\//i.test((this.urlFondoLote ?? '').trim());
      return fondoValido || total > 0;
    }

    const total = this.extraerUrlsDesdeTextoLote(this.urlsImagenesLote ?? '').length;
    if (this.esModalFondoDesdeDrive) {
      return total === 1;
    }
    return total > 0;
  }

  get totalImagenesSeleccionadas(): number {
    return this.imagenesSeleccionadas.size;
  }

  get destinosOpciones(): TpSelectSearchOption[] {
    const destinos = this.form.get('tipo_catalogo')?.value === 'INTERNACIONAL'
      ? this.destinosInternacionales
      : this.destinosCatalogo;
    return destinos.map((destino) => ({ value: destino.id, label: destino.nombre }));
  }

  get regionesInternacionalesOpciones(): TpSelectSearchOption[] {
    return this.regionesInternacionales.map((region) => ({ value: region.id, label: region.nombre }));
  }

  get paisesInternacionalesOpciones(): TpSelectSearchOption[] {
    return this.paisesInternacionales.map((pais) => ({ value: pais.id, label: pais.nombre }));
  }

  get descuentosOpciones(): TpSelectSearchOption[] {
    return [{ value: 0, label: 'Sin descuento' }, ...this.descuentos.map((descuento) => ({ value: descuento.id, label: descuento.tipo_descuento }))];
  }

  get regimenesOpciones(): TpSelectSearchOption[] {
    return [{ value: 0, label: 'Sin regimen principal' }, ...this.regimenes.map((regimen) => ({ value: regimen.id, label: regimen.descripcion }))];
  }

  get galeriaHotel(): FolderImageManagerFolder[] {
    const carpetas = new Map<string, FolderImageManagerFolder>();

    this.imagenes.forEach((imagen, index) => {
      const tipoImagenId = this.parseNumber(imagen.tipo_imagen_id);
      const sinTipo = tipoImagenId === null;
      const carpetaId = sinTipo ? 'sin-tipo' : `tipo-${tipoImagenId}`;
      const nombreCarpeta = sinTipo ? 'Sin tipo asignado' : this.obtenerDescripcionTipoImagen(tipoImagenId);

      if (!carpetas.has(carpetaId)) {
        carpetas.set(carpetaId, {
          id: carpetaId,
          name: nombreCarpeta,
          description: sinTipo ? 'Imagenes pendientes de clasificar' : 'Imagenes clasificadas por tipo',
          images: []
        });
      }

      carpetas.get(carpetaId)?.images.push({
        id: imagen.key,
        draftKey: imagen.key,
        name: `Imagen ${index + 1}`,
        imageUrl: imagen.url_imagen,
        folderId: carpetaId,
        folderName: nombreCarpeta,
        typeLabel: nombreCarpeta,
        typeValue: tipoImagenId
      });
    });

    return Array.from(carpetas.values()).sort((a, b) => {
      if (a.id === 'sin-tipo') return -1;
      if (b.id === 'sin-tipo') return 1;
      return a.name.localeCompare(b.name);
    });
  }

  get opcionesTipoImagenGaleria(): FolderImageManagerTypeOption[] {
    return this.tiposImagen.map((tipo) => ({ value: tipo.id, label: tipo.descripcion }));
  }

  get todasImagenesSeleccionadas(): boolean {
    return this.imagenes.length > 0 && this.imagenesSeleccionadas.size === this.imagenes.length;
  }

  private formatearUrlsComoLista(urls: string[]): string {
    return (urls ?? []).map((url, index) => `${index + 1}. ${url}`).join('\n');
  }

  async obtenerImagenesHotel(carpetaId: string, endpoint = EditarHotelComponent.DRIVE_IMAGENES_ENDPOINT): Promise<string[]> {
    const url = `${endpoint}?carpetaId=${encodeURIComponent(carpetaId)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('No se pudieron obtener las imagenes del hotel');
    }

    const result = await response.json();
    if (!result?.ok) {
      throw new Error(result?.message || 'Error al obtener imagenes');
    }

    const data = Array.isArray(result?.data) ? result.data : [];
    return data
      .map((item: any) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item.url === 'string') return item.url.trim();
        if (item && typeof item.url_imagen === 'string') return item.url_imagen.trim();
        return '';
      })
      .filter((item: string) => /^https?:\/\//i.test(item));
  }

  async obtenerCargaDriveCreacionHotel(carpetaId: string): Promise<{ fondo: string; imagenes: string[] }> {
    const url =
      `${EditarHotelComponent.DRIVE_CARGA_CREACION_ENDPOINT}?carpetaId=${encodeURIComponent(carpetaId)}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('No se pudo consultar imagenes de Drive');
    }

    const result: any = await response.json();
    if (!result?.ok) {
      throw new Error(result?.message || 'Error al obtener imagenes de Drive');
    }

    const fondoRaw = Array.isArray(result?.data?.fondo) ? result.data.fondo : [];
    const imagenesRaw = Array.isArray(result?.data?.imagenes) ? result.data.imagenes : [];

    const fondo =
      fondoRaw
        .map((item: any) => (typeof item === 'string' ? item.trim() : ''))
        .find((url: string) => /^https?:\/\//i.test(url)) ?? '';

    const imagenes = imagenesRaw
      .map((item: any) => (typeof item === 'string' ? item.trim() : ''))
      .filter((url: string) => /^https?:\/\//i.test(url));

    return { fondo, imagenes };
  }

  extraerIdCarpetaDrive(url: string): string {
    if (!url) return '';

    const limpio = url.trim();

    // Caso: https://drive.google.com/drive/u/2/folders/ID
    const matchFolders = limpio.match(/\/folders\/([a-zA-Z0-9_-]+)/);

    if (matchFolders?.[1]) {
      return matchFolders[1];
    }

    // Si el usuario pega directamente el ID
    const matchIdDirecto = limpio.match(/^[a-zA-Z0-9_-]{10,}$/);

    if (matchIdDirecto) {
      return limpio;
    }

    return '';
  }

  private extraerUrlsDesdeTextoLote(rawValue: string): string[] {
    const raw = (rawValue ?? '').trim();
    if (!raw) return [];

    if (raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter((url) => /^https?:\/\//i.test(url));
        }
      } catch {
        // Si no es JSON valido, intentamos extraer por regex/split.
      }
    }

    const urlsRegex = raw.match(/https?:\/\/[^\s"'`,\]]+/g) ?? [];
    if (urlsRegex.length > 0) {
      return urlsRegex.map((url) => url.trim());
    }

    return raw
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/^["'\s,]+|["'\s,]+$/g, ''))
      .filter((url) => /^https?:\/\//i.test(url));
  }

  esImagenSeleccionada(key: string): boolean {
    return this.imagenesSeleccionadas.has(key);
  }

  toggleSeleccionImagen(key: string, checked: boolean): void {
    if (checked) {
      this.imagenesSeleccionadas.add(key);
      return;
    }

    this.imagenesSeleccionadas.delete(key);
  }

  toggleSeleccionTodasImagenes(): void {
    if (this.todasImagenesSeleccionadas) {
      this.imagenesSeleccionadas.clear();
      return;
    }

    this.imagenesSeleccionadas = new Set(this.imagenes.map((imagen) => imagen.key));
  }

  eliminarImagenesSeleccionadas(): void {
    if (!this.imagenesSeleccionadas.size) {
      return;
    }

    this.imagenes
      .filter((imagen) => this.imagenesSeleccionadas.has(imagen.key))
      .forEach((imagen) => this.marcarImagenComoEliminada(imagen));

    this.imagenes = this.imagenes.filter((imagen) => !this.imagenesSeleccionadas.has(imagen.key));
    this.imagenesSeleccionadas.clear();
    this.mostrarModalEliminarImagenesSeleccionadas = false;
  }

  solicitarEliminarImagenesSeleccionadas(): void {
    if (!this.imagenesSeleccionadas.size) {
      return;
    }

    this.mostrarModalEliminarImagenesSeleccionadas = true;
  }

  cerrarModalEliminarImagenesSeleccionadas(): void {
    this.mostrarModalEliminarImagenesSeleccionadas = false;
  }

  confirmarEliminarImagenesSeleccionadas(): void {
    this.eliminarImagenesSeleccionadas();
  }

  eliminarImagen(index: number) {
    const imagen = this.imagenes[index];
    const key = imagen?.key;
    if (imagen) {
      this.marcarImagenComoEliminada(imagen);
    }
    if (key) {
      this.imagenesSeleccionadas.delete(key);
    }

    this.imagenes = this.imagenes.filter((_, currentIndex) => currentIndex !== index);
  }

  private marcarImagenComoEliminada(imagen: IImagenEditable): void {
    if (!imagen) {
      return;
    }

    const id = this.parseNumber(imagen.id);
    const url = (imagen.url_imagen ?? '').trim();

    const yaExiste = this.imagenesEliminadasPendientes.some((item) => {
      const itemId = this.parseNumber(item.id);
      if (id && itemId && id === itemId) return true;
      if (!id && !itemId && url && (item.url_imagen ?? '').trim() === url) return true;
      return false;
    });

    if (yaExiste) {
      return;
    }

    this.imagenesEliminadasPendientes.push({
      key: imagen.key,
      id,
      url_imagen: url,
      tipo_imagen_id: this.parseNumber(imagen.tipo_imagen_id),
      eliminar: true
    });
  }

  actualizarUrlImagen(index: number, value: string) {
    this.imagenes = this.imagenes.map((item, currentIndex) =>
      currentIndex === index ? { ...item, url_imagen: value } : item
    );
  }

  actualizarTipoImagen(index: number, value: number | null) {
    this.imagenes = this.imagenes.map((item, currentIndex) =>
      currentIndex === index ? { ...item, tipo_imagen_id: value } : item
    );
  }

  abrirImagen(url: string) {
    const value = (url ?? '').trim();
    if (!value) return;
    window.open(value, '_blank', 'noopener,noreferrer');
  }

  seleccionarImagenGaleria(imagen: FolderImageManagerImage): void {
    this.imagenSeleccionadaKey = String(imagen.id);
  }

  abrirModalEditarImagen(imagen: FolderImageManagerImage): void {
    const imagenHotel = this.imagenes.find((item) => item.key === String(imagen.id));
    if (!imagenHotel) return;

    this.imagenEditandoKey = imagenHotel.key;
    this.urlImagenEditando = imagenHotel.url_imagen;
    this.tipoImagenEdicionId = imagenHotel.tipo_imagen_id;
    this.mostrarModalEditarImagen = true;
  }

  cerrarModalEditarImagen(): void {
    this.mostrarModalEditarImagen = false;
    this.imagenEditandoKey = null;
    this.urlImagenEditando = '';
    this.tipoImagenEdicionId = null;
  }

  guardarEdicionImagen(): void {
    if (!this.imagenEditandoKey) return;

    this.imagenes = this.imagenes.map((imagen) =>
      imagen.key === this.imagenEditandoKey
        ? { ...imagen, url_imagen: this.urlImagenEditando.trim(), tipo_imagen_id: this.tipoImagenEdicionId }
        : imagen
    );
    this.cerrarModalEditarImagen();
  }

  eliminarImagenDesdeGaleria(imagen: FolderImageManagerImage): void {
    const index = this.imagenes.findIndex((item) => item.key === String(imagen.id));
    if (index >= 0) {
      this.eliminarImagen(index);
      if (this.imagenSeleccionadaKey === String(imagen.id)) {
        this.imagenSeleccionadaKey = null;
      }
    }
  }

  cambiarTipoImagenDesdeDetalle(evento: { image: FolderImageManagerImage; value: string | number | null }): void {
    const tipoImagenId = this.parseNumber(evento.value);
    this.imagenes = this.imagenes.map((imagen) =>
      imagen.key === String(evento.image.id) ? { ...imagen, tipo_imagen_id: tipoImagenId } : imagen
    );
  }

  abrirModalAsignarTipoImagenes(imagenes: FolderImageManagerImage[]): void {
    this.imagenesParaAsignarTipo = new Set(imagenes.map((imagen) => String(imagen.id)));
    this.tipoImagenMasivoId = null;
    this.mostrarModalAsignarTipoImagenes = true;
  }

  cerrarModalAsignarTipoImagenes(): void {
    this.mostrarModalAsignarTipoImagenes = false;
    this.imagenesParaAsignarTipo.clear();
    this.tipoImagenMasivoId = null;
  }

  confirmarAsignarTipoImagenes(): void {
    if (!this.imagenesParaAsignarTipo.size) return;

    this.imagenes = this.imagenes.map((imagen) =>
      this.imagenesParaAsignarTipo.has(imagen.key)
        ? { ...imagen, tipo_imagen_id: this.tipoImagenMasivoId }
        : imagen
    );
    this.reinicioSeleccionGaleria++;
    this.cerrarModalAsignarTipoImagenes();
  }

  private obtenerDescripcionTipoImagen(tipoImagenId: number | null): string {
    return this.tiposImagen.find((tipo) => tipo.id === tipoImagenId)?.descripcion ?? 'Sin tipo';
  }

  async guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const destinoId = Number(this.form.get('destino_id')?.value);
    const catalogoDestinoId = Number(this.form.get('catalogo_destino_id')?.value);
    if (this.esCreacion && !Number.isFinite(catalogoDestinoId)) {
      this.error = 'Selecciona un destino valido.';
      return;
    }
    if (!this.esCreacion && !Number.isFinite(destinoId) && !Number.isFinite(catalogoDestinoId)) {
      this.error = 'Selecciona un destino valido.';
      return;
    }

    this.guardando = true;
    this.error = '';
    this.mostrarModalExito = false;

    try {
      const raw = this.form.getRawValue();
      await this.traducirHotelDesdeEspanol(false);
      const regimenPrincipalId = this.parseNumber(raw.regimen_principal_id);
      const descuentoId = this.parseNumber(raw.descuento_id);
      if (regimenPrincipalId) {
        this.regimenesSeleccionados.add(regimenPrincipalId);
      }

      const nombreEspanol = (raw.nombre_hotel ?? '').trim();
      const descripcionEspanol = this.limpiarTexto(raw.descripcion);
      const traduccionesHotel = this.idiomas.map((idioma) => {
        if (idioma.codigo === 'es') {
          return {
            idioma_id: idioma.id,
            nombre_hotel: nombreEspanol,
            descripcion: descripcionEspanol
          };
        }

        const traducido = this.concentradoTraduccionesHotel[idioma.codigo];
        const existente = this.traduccionesHotelExistentes.get(idioma.id);

        return {
          idioma_id: idioma.id,
          nombre_hotel: this.limpiarTexto(traducido?.nombre) ?? this.limpiarTexto(existente?.nombre_hotel) ?? nombreEspanol,
          descripcion: this.limpiarTexto(traducido?.descripcion) ?? this.limpiarTexto(existente?.descripcion) ?? descripcionEspanol
        };
      });

      const payloadGuardar = {
        nombre_hotel: nombreEspanol,
        descripcion: descripcionEspanol,
        orden: this.parseNumber(raw.orden),
        estrellas: this.parseNumber(raw.estrellas),
        fondo: this.limpiarTexto(raw.fondo),
        ubicacion: this.limpiarTexto(raw.ubicacion),
        destino_id: this.esCreacion ? null : destinoId,
        catalogo_destino_id: Number.isFinite(catalogoDestinoId) ? catalogoDestinoId : undefined,
        descuento_id: descuentoId,
        regimen_id: regimenPrincipalId,
        regimen_ids: Array.from(this.regimenesSeleccionados.values()),
        actividad_ids: Array.from(this.actividadesSeleccionadas.values()),
        room_type_ids: Array.from(this.tiposHabitacionSeleccionados.values()),
        imagenes: [
          ...this.imagenes.map((item) => ({
            id: this.parseNumber(item.id),
            url_imagen: item.url_imagen,
            tipo_imagen_id: this.parseNumber(item.tipo_imagen_id),
            eliminar: false
          })),
          ...this.imagenesEliminadasPendientes.map((item) => ({
            id: this.parseNumber(item.id),
            url_imagen: item.url_imagen,
            tipo_imagen_id: this.parseNumber(item.tipo_imagen_id),
            eliminar: true
          }))
        ],
        traducciones: traduccionesHotel
      };

      if (this.esCreacion) {
        const hotelIdCreado = await this.supabase.crearHotelDetalleAdmin(payloadGuardar);
        this.hotelId = hotelIdCreado;
        this.esCreacion = false;
        this.mensajeModalExito = 'Hotel creado correctamente.';
      } else {
        const hotelId = Number(this.hotelId);
        if (!Number.isFinite(hotelId)) {
          throw new Error('No se encontro el hotel a editar.');
        }

        await this.supabase.actualizarHotelDetalleAdmin({
          hotelId,
          ...payloadGuardar
        });
        this.mensajeModalExito = 'Hotel actualizado correctamente.';
      }

      this.imagenesEliminadasPendientes = [];
      this.marcarEstadoGuardado();
      this.error = '';
      this.mostrarModalExito = true;
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo guardar la informacion del hotel.';
    } finally {
      this.guardando = false;
    }
  }

  solicitarRegresar() {
    if (this.guardando) return;

    if (!this.tieneCambiosPendientes) {
      this.regresar();
      return;
    }

    this.mostrarModalCambiosPendientes = true;
  }

  cerrarModalCambiosPendientes() {
    this.mostrarModalCambiosPendientes = false;
  }

  abrirModalActividadesSeleccionadas() {
    this.mostrarModalActividadesSeleccionadas = true;
  }

  cerrarModalActividadesSeleccionadas() {
    this.mostrarModalActividadesSeleccionadas = false;
  }

  descartarCambiosYRegresar() {
    this.mostrarModalCambiosPendientes = false;
    this.regresar();
  }

  guardarCambiosPendientesYRegresar() {
    if (!this.tieneCambiosPendientes || this.guardando) return;
    this.mostrarModalCambiosPendientes = false;
    this.guardar();
  }

  regresar() {
    this.router.navigate(['/admin/hoteles'], {
      queryParams: this.route.snapshot.queryParams
    });
  }

  cerrarModalExito() {
    this.mostrarModalExito = false;
    this.regresar();
  }

  trackById(_: number, item: { id: number }) {
    return item.id;
  }

  trackByKey(_: number, item: IImagenEditable) {
    return item.key;
  }

  obtenerTraduccionHotelVista(idioma: IIdiomaHotel): ITraduccionHotelVista {
    const raw = this.form.getRawValue();
    const nombreEs = this.limpiarTexto(raw.nombre_hotel) ?? '';
    const descripcionEs = this.limpiarTexto(raw.descripcion) ?? '';

    if (idioma.codigo === 'es') {
      return {
        nombre_hotel: nombreEs,
        descripcion: descripcionEs
      };
    }

    const traducido = this.concentradoTraduccionesHotel[idioma.codigo];
    const existente = this.traduccionesHotelExistentes.get(idioma.id);

    return {
      nombre_hotel: this.limpiarTexto(traducido?.nombre) ?? this.limpiarTexto(existente?.nombre_hotel) ?? '',
      descripcion: this.limpiarTexto(traducido?.descripcion) ?? this.limpiarTexto(existente?.descripcion) ?? ''
    };
  }

  async traducirHotelDesdeEspanol(requerirExito = false) {
    const raw = this.form.getRawValue();
    const esNombre = this.limpiarTexto(raw.nombre_hotel);
    const esDescripcion = this.limpiarTexto(raw.descripcion);

    if (!esNombre || !esDescripcion) {
      return;
    }

    const llaveActual = `${esNombre}|${esDescripcion}`;
    if (
      llaveActual === this.ultimaLlaveTraduccionHotel &&
      Object.keys(this.concentradoTraduccionesHotel).length > 0
    ) {
      return;
    }

    this.traduciendoContenido = true;
    try {
      const traducciones = await this.supabase.traducirDesdeEspanol({
        title: esNombre,
        description: esDescripcion
      });

      this.concentradoTraduccionesHotel = this.idiomas.reduce((acc, idioma) => {
        const traduccionIdioma = traducciones?.[idioma.codigo];
        if (!traduccionIdioma) return acc;

        acc[idioma.codigo] = {
          nombre: typeof traduccionIdioma.title === 'string' ? traduccionIdioma.title : '',
          descripcion: typeof traduccionIdioma.description === 'string' ? traduccionIdioma.description : ''
        };
        return acc;
      }, {} as Record<string, { nombre: string; descripcion: string }>);

      this.ultimaLlaveTraduccionHotel = llaveActual;
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo traducir la informacion del hotel.';
      if (requerirExito) {
        throw error;
      }
    } finally {
      this.traduciendoContenido = false;
    }
  }

  private limpiarTexto(value: string | null | undefined): string | null {
    const limpio = (value ?? '').trim();
    return limpio ? limpio : null;
  }

  private parseNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private marcarEstadoGuardado(): void {
    this.snapshotEstadoInicial = this.serializarEstadoActual();
  }

  private serializarEstadoActual(): string {
    const raw = this.form.getRawValue();

    const imagenesNormalizadas = this.imagenes.map((item) => ({
      id: this.parseNumber(item.id),
      url_imagen: (item.url_imagen ?? '').trim(),
      tipo_imagen_id: this.parseNumber(item.tipo_imagen_id)
    }));
    const imagenesEliminadas = this.imagenesEliminadasPendientes.map((item) => ({
      id: this.parseNumber(item.id),
      url_imagen: (item.url_imagen ?? '').trim(),
      tipo_imagen_id: this.parseNumber(item.tipo_imagen_id),
      eliminar: true
    }));

    const estado = {
      form: {
        nombre_hotel: (raw.nombre_hotel ?? '').trim(),
        orden: this.parseNumber(raw.orden),
        descripcion: (raw.descripcion ?? '').trim(),
        fondo: (raw.fondo ?? '').trim(),
        descuento_id: this.parseNumber(raw.descuento_id),
        destino_id: this.parseNumber(raw.destino_id),
        continente_id: this.parseNumber(raw.continente_id),
        pais_id: this.parseNumber(raw.pais_id),
        catalogo_destino_id: this.parseNumber(raw.catalogo_destino_id),
        tipo_catalogo: raw.tipo_catalogo ?? null,
        estrellas: this.parseNumber(raw.estrellas),
        ubicacion: (raw.ubicacion ?? '').trim(),
        regimen_principal_id: this.parseNumber(raw.regimen_principal_id)
      },
      regimenes: Array.from(this.regimenesSeleccionados).sort((a, b) => a - b),
      actividades: Array.from(this.actividadesSeleccionadas).sort((a, b) => a - b),
      tipos_habitacion: Array.from(this.tiposHabitacionSeleccionados).sort((a, b) => a - b),
      imagenes: imagenesNormalizadas,
      imagenes_eliminadas: imagenesEliminadas
    };

    return JSON.stringify(estado);
  }

  async cambiarTipoCatalogo(tipo: 'NACIONAL' | 'INTERNACIONAL' | null): Promise<void> {
    const controlDestino = this.form.get('catalogo_destino_id');
    this.form.patchValue({ tipo_catalogo: tipo, continente_id: null, pais_id: null });
    this.actualizarValidacionesUbicacionInternacional(tipo === 'INTERNACIONAL');
    this.paisesInternacionales = [];
    this.destinosInternacionales = [];
    controlDestino?.reset(null, { emitEvent: false });
    this.cargandoDestinos = Boolean(tipo);
    if (tipo) {
      controlDestino?.enable({ emitEvent: false });
    } else {
      controlDestino?.disable({ emitEvent: false });
    }
    if (tipo === 'NACIONAL') {
      try {
        this.destinosCatalogo = (await this.destinosService.obtenerCatalogoNacionalDestinos()) as IDestinoCatalogoAdmin[];
      } finally {
        this.cargandoDestinos = false;
      }
      return;
    }

    this.destinosCatalogo = [];
    try {
      this.regionesInternacionales = tipo
        ? await this.destinosService.obtenerCatalogoInternacionalRegiones()
        : [];
    } finally {
      this.cargandoDestinos = false;
    }
  }

  async seleccionarContinenteInternacional(regionId: string | number | null): Promise<void> {
    const id = this.parseNumber(regionId);
    this.form.patchValue({ continente_id: id, pais_id: null });
    this.paisesInternacionales = id
      ? await this.destinosService.obtenerCatalogoInternacionalPaises([id])
      : [];
    this.destinosInternacionales = [];
    this.form.get('catalogo_destino_id')?.reset(null, { emitEvent: false });
  }

  async seleccionarPaisInternacional(paisId: string | number | null): Promise<void> {
    const id = this.parseNumber(paisId);
    this.form.patchValue({ pais_id: id });
    this.cargandoDestinos = Boolean(id);
    try {
      this.destinosInternacionales = id
        ? await this.destinosService.obtenerCatalogoInternacionalDestinosPorPais(id)
        : [];
    } finally {
      this.cargandoDestinos = false;
    }
    this.form.get('catalogo_destino_id')?.reset(null, { emitEvent: false });
  }

  private async restaurarUbicacionInternacional(catalogoDestinoId: number | null): Promise<void> {
    if (!catalogoDestinoId) return;
    this.cargandoDestinos = true;
    try {
      const destinos = await this.destinosService.obtenerCatalogoInternacionalDestinos();
      const destino = destinos.find((item) => item.id === catalogoDestinoId);
      if (!destino) return;

      const pais = (await this.destinosService.obtenerCatalogoInternacionalPaises([destino.pais_id]))
        .find((item) => item.id === destino.pais_id);
      if (!pais) return;

      this.form.patchValue({ continente_id: pais.region_id, pais_id: pais.id }, { emitEvent: false });
      this.paisesInternacionales = await this.destinosService.obtenerCatalogoInternacionalPaises([pais.region_id]);
      this.destinosInternacionales = await this.destinosService.obtenerCatalogoInternacionalDestinosPorPais(pais.id);
    } finally {
      this.cargandoDestinos = false;
    }
  }

  private configurarValidacionesCreacion(): void {
    const camposObligatorios = [
      'nombre_hotel',
      'tipo_catalogo',
      'catalogo_destino_id',
      'regimen_principal_id',
      'ubicacion',
      'fondo'
    ];

    camposObligatorios.forEach((campo) => {
      this.form.get(campo)?.addValidators(Validators.required);
      this.form.get(campo)?.updateValueAndValidity({ emitEvent: false });
    });
    this.actualizarValidacionesUbicacionInternacional(this.form.get('tipo_catalogo')?.value === 'INTERNACIONAL');
  }

  private actualizarValidacionesUbicacionInternacional(esInternacional: boolean): void {
    ['continente_id', 'pais_id'].forEach((campo) => {
      const control = this.form.get(campo);
      if (esInternacional && this.esCreacion) {
        control?.addValidators(Validators.required);
      } else {
        control?.removeValidators(Validators.required);
      }
      control?.updateValueAndValidity({ emitEvent: false });
    });
  }

  private actualizarPreviewUbicacion(): void {
    const url = (this.form.get('ubicacion')?.value ?? '').toString().trim();
    if (!url) {
      this.coordenadasUbicacion = null;
      this.destruirMapaUbicacion();
      return;
    }

    const coordenadas = this.extraerCoordenadasDesdeUrl(url);
    this.coordenadasUbicacion = coordenadas;

    if (!coordenadas) {
      this.destruirMapaUbicacion();
      return;
    }

    setTimeout(() => this.renderizarMapaUbicacion(coordenadas), 0);
  }

  private renderizarMapaUbicacion(coordenadas: { lat: number; lng: number }): void {
    const element = this.ubicacionMapElement?.nativeElement;
    if (!element) {
      return;
    }

    if (!this.mapaUbicacion) {
      this.mapaUbicacion = L.map(element).setView(
        [coordenadas.lat, coordenadas.lng],
        EditarHotelComponent.ZOOM_VISTA_CERCANA
      );
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this.mapaUbicacion);

      const icon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      this.marcadorUbicacion = L.marker([coordenadas.lat, coordenadas.lng], { icon })
        .addTo(this.mapaUbicacion)
        .bindTooltip('Ubicacion del hotel', { permanent: true, direction: 'top', offset: [0, -40] });
    } else {
      this.mapaUbicacion.setView(
        [coordenadas.lat, coordenadas.lng],
        EditarHotelComponent.ZOOM_VISTA_CERCANA
      );
      this.marcadorUbicacion?.setLatLng([coordenadas.lat, coordenadas.lng]);
    }

    setTimeout(() => this.mapaUbicacion?.invalidateSize(), 100);
  }

  private destruirMapaUbicacion(): void {
    if (this.mapaUbicacion) {
      this.mapaUbicacion.remove();
      this.mapaUbicacion = undefined;
      this.marcadorUbicacion = undefined;
    }
  }

  private extraerCoordenadasDesdeUrl(url: string): { lat: number; lng: number } | null {
    const regex3d4d = /!3d([-0-9.]+)!4d([-0-9.]+)/;
    const match3d4d = url.match(regex3d4d);
    if (match3d4d) {
      return { lat: parseFloat(match3d4d[1]), lng: parseFloat(match3d4d[2]) };
    }

    const regexAt = /@([-0-9.]+),([-0-9.]+)/;
    const matchAt = url.match(regexAt);
    if (matchAt) {
      return { lat: parseFloat(matchAt[1]), lng: parseFloat(matchAt[2]) };
    }

    try {
      const parsed = new URL(url);
      const q = parsed.searchParams.get('q') ?? parsed.searchParams.get('query');
      if (q) {
        const coords = q.match(/^\s*([-0-9.]+)\s*,\s*([-0-9.]+)\s*$/);
        if (coords) {
          return { lat: parseFloat(coords[1]), lng: parseFloat(coords[2]) };
        }
      }
    } catch {
      return null;
    }

    return null;
  }
}
