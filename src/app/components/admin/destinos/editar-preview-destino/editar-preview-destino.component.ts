import { AfterViewInit, Component, DoCheck, ElementRef, ViewChild, inject, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormArray, UntypedFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { Subscription } from 'rxjs';
import {
  IIdiomaPreviewAdmin,
  IPreviewDestinoAdmin
} from 'app/core/supabase.service';
import { DestinosService } from 'app/core/destinos.service';
import { ActividadesService } from 'app/core/actividades.service';
import { TraduccionesService } from 'app/core/traducciones.service';
import { BlockingLoaderComponent } from 'app/shared/blocking-loader/blocking-loader.component';
import { MaterialModule } from 'app/shared/material.module';
import { TpInputComponent } from 'app/shared/tp-input/tp-input.component';
import { TpSelectSearchComponent, TpSelectSearchOption } from 'app/shared/tp-select-search/tp-select-search.component';
import { TpToastService } from 'app/shared/tp-toast/tp-toast.service';

interface ILangConfig {
  code: string;
  label: string;
}

@Component({
  selector: 'app-editar-preview-destino',
  standalone: true,
  imports: [MaterialModule, DragDropModule, BlockingLoaderComponent, TpInputComponent, TpSelectSearchComponent],
  templateUrl: './editar-preview-destino.component.html',
  styleUrl: './editar-preview-destino.component.scss'
})
export class EditarPreviewDestinoComponent implements OnInit, AfterViewInit {
  private static readonly ZOOM_VISTA_LEJANA = 12;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destinosService = inject(DestinosService);
  private readonly actividadesService = inject(ActividadesService);
  private readonly traduccionesService = inject(TraduccionesService);
  private readonly toast = inject(TpToastService);
  private readonly fb = inject(UntypedFormBuilder);
  @ViewChild('ubicacionMapPreview') private ubicacionMapElement?: ElementRef<HTMLDivElement>;

  private readonly idiomasConfig: ILangConfig[] = [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'Inglés' },
    { code: 'pt', label: 'Portugués' },
    { code: 'de', label: 'Alemán' },
    { code: 'fr', label: 'Francés' }
  ];

  destinoId!: number;
  destinoNombre = '';
  cargando = true;
  guardando = false;
  guardandoUbicacion = false;
  actualizandoOrden = false;
  error = '';
  mostrarModalExito = false;
  mensajeModalExito = 'Preview del destino actualizado correctamente.';
  mostrarModalEditarDatoRapido = false;
  mostrarModalNuevoDatoRapido = false;
  mostrarModalEditarActividad = false;
  mostrarModalNuevaActividad = false;
  mostrarModalConfirmarEliminarActividad = false;
  mostrarModalConfirmarEliminarDatoRapido = false;
  guardandoActividad = false;
  agregandoDatoRapido = false;
  traduciendoActividad = false;
  traduciendoTextoPreview = false;
  eliminandoActividadIndex: number | null = null;
  cambiandoActivoDatoRapidoId: number | null = null;
  eliminandoDatoRapidoId: number | null = null;
  indiceActividadAEliminar: number | null = null;
  indiceDatoRapidoEditando: number | null = null;
  indiceDatoRapidoAEliminar: number | null = null;
  indiceActividadEditando: number | null = null;
  concentradoTraduccionesActividad: Record<string, { nombre: string; descripcion: string }> = {};
  private ultimaLlaveTraduccionActividad = '';
  private ultimaLlaveTraduccionTextoPreview = '';
  private guardadoUbicacionPendiente: Promise<boolean> | null = null;
  private modalAbiertoPrevio = false;
  private bodyOverflowOriginal = '';
  private bodyPaddingRightOriginal = '';
  private scrollBodyBloqueado = false;
  private ubicacionSub?: Subscription;
  private L: any = null;
  private mapaUbicacion?: any;
  private marcadorUbicacion?: any;

  idiomas: IIdiomaPreviewAdmin[] = [];
  catalogoTiposDatoRapido: Array<{ id: number; clave: string; nombre: string }> = [];
  coordenadasUbicacion: { lat: number; lng: number } | null = null;

  form = this.fb.group({
    ubicacion: [''],
    traducciones: this.fb.array([]),
    detallesRapidos: this.fb.array([]),
    actividades: this.fb.array([])
  });

  formEditarDatoRapido = this.fb.group({
    nombre: [{ value: '', disabled: true }],
    valores: this.fb.group({})
  });

  formNuevoDatoRapido = this.fb.group({
    tipo_dato_rapido_id: [null as number | null, [Validators.required]],
    valores: this.fb.group({})
  });

  formActividad = this.fb.group({
    catalogo_atraccion_id: [null as number | null, [Validators.required]],
    imagen_fondo: [''],
    imagenes: this.fb.array([]),
    traducciones: this.fb.group({})
  });

  get traduccionesArray(): UntypedFormArray {
    return this.form.get('traducciones') as UntypedFormArray;
  }

  get indiceEspanol(): number {
    return this.traduccionesArray.controls.findIndex((traduccion) => traduccion.get('codigo')?.value === 'es');
  }

  get detallesRapidosArray(): UntypedFormArray {
    return this.form.get('detallesRapidos') as UntypedFormArray;
  }

  get actividadesArray(): UntypedFormArray {
    return this.form.get('actividades') as UntypedFormArray;
  }

  get imagenesActividadArray(): UntypedFormArray {
    return this.formActividad.get('imagenes') as UntypedFormArray;
  }

  catalogoAtracciones: Array<{ id: number; clave: string; nombre: string }> = [];
  busquedaActividades = '';
  tipoActividadActivo: number | null = null;

  get tiposConActividades(): Array<{ id: number; clave: string; nombre: string }> {
    const tiposCargados = new Set(
      this.actividadesArray.controls
        .map((actividad) => this.parseNumber(actividad.get('catalogo_atraccion_id')?.value))
        .filter((tipoId): tipoId is number => tipoId !== null)
    );

    return this.catalogoAtracciones.filter((tipo) => tiposCargados.has(tipo.id));
  }

  get actividadesFiltradas(): Array<{ control: any; formIndex: number }> {
    const busqueda = this.normalizarTextoFiltro(this.busquedaActividades);

    return this.actividadesArray.controls
      .map((control, formIndex) => ({ control, formIndex }))
      .filter(({ control }) => {
        const tipoId = this.parseNumber(control.get('catalogo_atraccion_id')?.value);
        const nombre = control.get(['traducciones', 'es', 'nombre'])?.value;

        return (
          (this.tipoActividadActivo === null || tipoId === this.tipoActividadActivo) &&
          (!busqueda || this.normalizarTextoFiltro(nombre).includes(busqueda))
        );
      });
  }

  seleccionarTipoActividad(tipoId: number | null): void {
    this.tipoActividadActivo = tipoId;
    setTimeout(() => this.desplazarASeccion('atracciones'));
  }

  limpiarFiltrosActividades(): void {
    this.busquedaActividades = '';
    this.tipoActividadActivo = null;
  }

  obtenerNombreTipoActividad(actividad: any): string {
    const tipoId = this.parseNumber(actividad.get('catalogo_atraccion_id')?.value);
    const nombreCatalogo = this.catalogoAtracciones.find((tipo) => tipo.id === tipoId)?.nombre;

    return nombreCatalogo || actividad.get('tipo_actividad')?.value || 'Sin clasificar';
  }

  get bloqueandoPantalla(): boolean {
    return (
      this.cargando ||
      this.guardando ||
      this.actualizandoOrden ||
      this.guardandoActividad ||
      this.traduciendoActividad ||
      this.eliminandoActividadIndex !== null
    );
  }

  ngAfterViewInit(): void {
    this.actualizarPreviewUbicacion();
  }

  async ngOnInit() {
    const idRaw = this.route.snapshot.paramMap.get('id');
    const id = Number(idRaw);

    if (!idRaw || !Number.isFinite(id)) {
      this.error = 'No se encontro el destino a editar.';
      this.cargando = false;
      return;
    }

    this.destinoId = id;
    this.ubicacionSub = this.form.get('ubicacion')?.valueChanges.subscribe(() => {
      this.actualizarPreviewUbicacion();
    });

    try {
      this.L = await import('leaflet');
      const data = await this.destinosService.obtenerPreviewDestinoAdmin(id);
      this.inicializarFormulario(data);
      this.actualizarPreviewUbicacion();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo cargar la informacion del preview.';
    } finally {
      this.cargando = false;
    }
  }

  ngDoCheck(): void {
    const hayModalAbierto = this.existeModalAbierto();
    if (hayModalAbierto === this.modalAbiertoPrevio) {
      return;
    }

    this.modalAbiertoPrevio = hayModalAbierto;
    this.bloquearScrollBody(hayModalAbierto);
  }

  ngOnDestroy(): void {
    this.ubicacionSub?.unsubscribe();
    this.destruirMapaUbicacion();
    this.bloquearScrollBody(false);
  }



  async guardar(mostrarExito = true): Promise<boolean> {
    const ubicacionGuardada = await this.guardarUbicacion();
    if (!ubicacionGuardada) {
      return false;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'La ubicación se guardó, pero faltan campos obligatorios en el contenido en español.';
      return false;
    }

    this.guardando = true;
    this.error = '';

    try {
      await this.traducirTextosPreviewDesdeCamposEspanol();
      const raw = this.form.getRawValue();
      const detallesRapidos = (raw.detallesRapidos ?? []).map((item: any, index: number) => ({
        tipo_dato_rapido_id: Number(item.tipo_dato_rapido_id),
        orden: Number(item.orden ?? index + 1),
        valores: this.idiomas.map((idioma) => ({
          idioma_id: idioma.id,
          valor: this.limpiarTexto(item?.valores?.[idioma.codigo])
        }))
      }));

      const resultado = await this.destinosService.guardarPreviewDestinoAdmin({
        catalogo_destino_id: this.destinoId,
        ubicacion: this.limpiarTexto(raw.ubicacion),
        traducciones: (raw.traducciones ?? []).map((item: any) => ({
          idioma_id: Number(item.idioma_id),
          nombre: this.limpiarTexto(item.nombre),
          apodo: null,
          descripcion_corta: this.limpiarTexto(item.descripcion_corta),
          descripcion_larga: this.limpiarTexto(item.descripcion_larga),
          titulo_descripcion: this.limpiarTexto(item.titulo_descripcion)
        })),
        detalles_rapidos: detallesRapidos,
        actividades: (raw.actividades ?? []).map((actividad: any) => {
          const imagenes = this.normalizarImagenesActividadPayload(actividad?.imagenes ?? []);
          const imagenPrincipal = this.obtenerImagenPrincipalGaleria(
            imagenes,
            this.limpiarTexto(actividad.imagen_fondo)
          );

          return {
            id: this.parseNumber(actividad.id),
            catalogo_atraccion_id: this.parseNumber(actividad.catalogo_atraccion_id),
            imagen_fondo: imagenPrincipal,
            imagenes,
            traducciones: this.idiomas.map((idioma) => ({
              idioma_id: idioma.id,
              nombre: this.limpiarTexto(actividad?.traducciones?.[idioma.codigo]?.nombre),
              descripcion: this.limpiarTexto(actividad?.traducciones?.[idioma.codigo]?.descripcion)
            }))
          };
        })
      });

      this.detallesRapidosArray.controls.forEach((detalle) => {
        const tipoId = Number(detalle.get('tipo_dato_rapido_id')?.value);
        const detalleRapidoId = resultado.detallesRapidosIds[tipoId];
        if (detalleRapidoId) {
          detalle.get('id')?.setValue(detalleRapidoId, { emitEvent: false });
        }
      });

      if (mostrarExito) {
        this.mensajeModalExito = 'Preview del destino actualizado correctamente.';
        this.mostrarModalExito = true;
      }
      return true;
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo guardar el preview del destino.';
      return false;
    } finally {
      this.guardando = false;
    }
  }

  regresar() {
    this.router.navigate(['/admin/destinos/configurar-destinos'], { queryParams: this.route.snapshot.queryParams });
  }

  desplazarASeccion(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  cerrarModalExito() {
    this.mostrarModalExito = false;
    this.regresar();
  }

  getControlTraduccion(index: number, field: string) {
    return this.traduccionesArray.at(index)?.get(field);
  }

  getControlDetalleRapido(index: number, codigoIdioma: string) {
    return this.detallesRapidosArray.at(index)?.get('valores')?.get(codigoIdioma);
  }

  getImagenesActividad(index: number): Array<{
    id: number;
    imagen_url: string;
    activa: boolean;
    orden: number | null;
    vigencia_desde: string | null;
    vigencia_hasta: string | null;
    created_at: string | null;
  }> {
    return (this.actividadesArray.at(index)?.get('imagenes')?.value ?? []) as Array<{
      id: number;
      imagen_url: string;
      activa: boolean;
      orden: number | null;
      vigencia_desde: string | null;
      vigencia_hasta: string | null;
      created_at: string | null;
    }>;
  }

  getImagenesActivasActividad(index: number): Array<{
    id: number;
    imagen_url: string;
    activa: boolean;
    orden: number | null;
    vigencia_desde: string | null;
    vigencia_hasta: string | null;
    created_at: string | null;
  }> {
    return this.getImagenesActividad(index).filter((img) => img.activa);
  }

  getImagenActivaActividad(index: number): {
    id: number;
    imagen_url: string;
    activa: boolean;
    orden: number | null;
    vigencia_desde: string | null;
    vigencia_hasta: string | null;
    created_at: string | null;
  } | null {
    const imagenes = this.getImagenesActividad(index);
    if (!imagenes || !imagenes.length) {
      return null;
    }
    return imagenes.find((img) => img.activa) ?? imagenes[0];
  }

  getImagenesActividadEditando(): Array<{
    id: number;
    imagen_url: string;
    activa: boolean;
    orden: number | null;
    vigencia_desde: string | null;
    vigencia_hasta: string | null;
    created_at: string | null;
  }> {
    if (this.indiceActividadEditando === null) {
      return [];
    }

    return this.getImagenesActividad(this.indiceActividadEditando);
  }

  getNombreIdioma(codigo: string): string {
    return this.idiomasConfig.find((item) => item.code === codigo)?.label ?? codigo.toUpperCase();
  }


  async traducirTextosPreviewDesdeCamposEspanol(): Promise<void> {
    const traduccionEspanol = this.traduccionesArray.at(this.indiceEspanol);
    if (!traduccionEspanol || traduccionEspanol.invalid || this.traduciendoTextoPreview) {
      return;
    }

    const textos = {
      nombre: this.limpiarTexto(traduccionEspanol.get('nombre')?.value) ?? '',
      titulo_descripcion: this.limpiarTexto(traduccionEspanol.get('titulo_descripcion')?.value) ?? '',
      descripcion_corta: this.limpiarTexto(traduccionEspanol.get('descripcion_corta')?.value) ?? '',
      descripcion_larga: this.limpiarTexto(traduccionEspanol.get('descripcion_larga')?.value) ?? ''
    };
    const llave = JSON.stringify(textos);
    if (llave === this.ultimaLlaveTraduccionTextoPreview) {
      return;
    }

    this.traduciendoTextoPreview = true;
    this.error = '';

    try {
      await this.traducirTextoPreviewDesdeEspanol(textos);
      this.ultimaLlaveTraduccionTextoPreview = llave;
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron traducir los textos del preview.';
    } finally {
      this.traduciendoTextoPreview = false;
    }
  }

  abrirModalNuevaActividad() {
    const traducciones = this.idiomas.reduce((acc, idioma) => {
      acc[idioma.codigo] = this.fb.group({
        nombre: [''],
        descripcion: ['']
      });
      return acc;
    }, {} as Record<string, any>);

    this.formActividad.reset({
      catalogo_atraccion_id: null,
      imagen_fondo: ''
    });
    this.formActividad.get('catalogo_atraccion_id')?.setValidators(Validators.required);
    this.formActividad.get('catalogo_atraccion_id')?.updateValueAndValidity();
    this.formActividad.setControl('traducciones', this.fb.group(traducciones));
    this.formActividad.setControl('imagenes', this.fb.array([]));
    this.concentradoTraduccionesActividad = {};
    this.ultimaLlaveTraduccionActividad = '';
    this.mostrarModalNuevaActividad = true;
    this.indiceActividadEditando = null;
  }

  abrirModalEditarActividad(index: number) {
    const actividad = this.actividadesArray.at(index);
    if (!actividad) return;

    const traducciones = this.idiomas.reduce((acc, idioma) => {
      acc[idioma.codigo] = this.fb.group({
        nombre: [actividad.get(['traducciones', idioma.codigo, 'nombre'])?.value ?? ''],
        descripcion: [actividad.get(['traducciones', idioma.codigo, 'descripcion'])?.value ?? '']
      });
      return acc;
    }, {} as Record<string, any>);

    this.formActividad.reset({
      catalogo_atraccion_id: this.parseNumber(actividad.get('catalogo_atraccion_id')?.value),
      imagen_fondo: actividad.get('imagen_fondo')?.value ?? ''
    });
    this.formActividad.get('catalogo_atraccion_id')?.clearValidators();
    this.formActividad.get('catalogo_atraccion_id')?.updateValueAndValidity();
    this.formActividad.setControl('traducciones', this.fb.group(traducciones));
    this.formActividad.setControl(
      'imagenes',
      this.buildImagenesFormArray(this.getImagenesActividad(index))
    );
    this.concentradoTraduccionesActividad = {};
    this.ultimaLlaveTraduccionActividad = '';
    this.indiceActividadEditando = index;
    this.mostrarModalEditarActividad = true;
  }

  abrirPantallaEditarActividad(index: number) {
    const actividad = this.actividadesArray.at(index);
    if (!actividad) return;

    const actividadId = this.parseNumber(actividad.get('id')?.value);
    if (!actividadId) {
      this.error = 'Primero guarda la actividad para poder editar sus imagenes en pantalla.';
      return;
    }

    this.router.navigate([
      '/admin/destinos/configurar-destinos/preview',
      this.destinoId,
      'actividad',
      actividadId
    ]);
  }

  cerrarModalActividad() {
    this.mostrarModalEditarActividad = false;
    this.mostrarModalNuevaActividad = false;
    this.indiceActividadEditando = null;
    this.traduciendoActividad = false;
    this.concentradoTraduccionesActividad = {};
    this.ultimaLlaveTraduccionActividad = '';
  }

  async onActividadEsBlurOEnter(codigoIdioma: string, event?: Event): Promise<void> {
    if (codigoIdioma !== 'es') {
      return;
    }

    if (event instanceof KeyboardEvent && event.key === 'Enter') {
      event.preventDefault();
    }

    if (this.traduciendoActividad || this.guardandoActividad) {
      return;
    }

    const raw = this.formActividad.getRawValue();
    const esNombre = this.limpiarTexto(raw?.traducciones?.es?.nombre);
    const esDescripcion = this.limpiarTexto(raw?.traducciones?.es?.descripcion);
    if (!esNombre || !esDescripcion) {
      return;
    }

    this.traduciendoActividad = true;
    this.error = '';

    try {
      await this.traducirActividadDesdeEspanol();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo traducir la actividad.';
    } finally {
      this.traduciendoActividad = false;
    }
  }

  async guardarActividad() {
    if (this.formActividad.invalid) {
      this.formActividad.markAllAsTouched();
      return;
    }

    if (this.guardandoActividad) {
      return;
    }

    this.guardandoActividad = true;
    this.error = '';

    try {
      await this.traducirActividadDesdeEspanol();

      const raw = this.formActividad.getRawValue();
      const actividadIndex = this.indiceActividadEditando;
      const actividadExistente = actividadIndex !== null ? this.actividadesArray.at(actividadIndex) : null;
      const actividadId = this.parseNumber(actividadExistente?.get('id')?.value);
      const imagenes = this.normalizarImagenesActividadPayload(raw.imagenes ?? []);
      const imagenPrincipal = this.obtenerImagenPrincipalGaleria(
        imagenes.length ? imagenes : undefined,
        this.limpiarTexto(raw.imagen_fondo)
      );

      const guardada = await this.actividadesService.guardarActividadDestinoAdmin({
        catalogo_destino_id: this.destinoId,
        actividad_id: actividadId,
        catalogo_atraccion_id: this.parseNumber(raw.catalogo_atraccion_id),
        imagen_fondo: imagenPrincipal,
        imagenes: imagenes.length
          ? imagenes
          : imagenPrincipal
            ? [{
                imagen_url: imagenPrincipal,
                activa: true,
                orden: 1,
                vigencia_desde: null,
                vigencia_hasta: null
              }]
            : [],
        traducciones: this.idiomas.map((idioma) => ({
          idioma_id: idioma.id,
          nombre: this.limpiarTexto(raw?.traducciones?.[idioma.codigo]?.nombre),
          descripcion: this.limpiarTexto(raw?.traducciones?.[idioma.codigo]?.descripcion)
        }))
      });

      if (actividadExistente) {
        const actividadForm = actividadExistente as any;
        actividadExistente.patchValue({
          id: guardada.id,
          catalogo_atraccion_id: this.parseNumber(raw.catalogo_atraccion_id),
          imagen_fondo: imagenPrincipal ?? ''
        });
        actividadForm.setControl('imagenes', this.buildImagenesFormArray(imagenes));

        this.idiomas.forEach((idioma) => {
          actividadExistente.get(['traducciones', idioma.codigo, 'nombre'])?.setValue(
            raw?.traducciones?.[idioma.codigo]?.nombre ?? ''
          );
          actividadExistente.get(['traducciones', idioma.codigo, 'descripcion'])?.setValue(
            raw?.traducciones?.[idioma.codigo]?.descripcion ?? ''
          );
        });
      } else {
        const actividadGroup = this.buildActividadGroup({
          id: guardada.id,
          catalogo_atraccion_id: this.parseNumber(raw.catalogo_atraccion_id),
          imagen_fondo: imagenPrincipal ?? '',
          imagenes,
          traducciones: raw.traducciones ?? {}
        });
        this.actividadesArray.push(actividadGroup);
      }

      this.cerrarModalActividad();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo guardar la actividad.';
    } finally {
      this.guardandoActividad = false;
    }
  }

  private async traducirActividadDesdeEspanol(): Promise<void> {
    const raw = this.formActividad.getRawValue();
    const esNombre = this.limpiarTexto(raw?.traducciones?.es?.nombre);
    const esDescripcion = this.limpiarTexto(raw?.traducciones?.es?.descripcion);

    if (!esNombre || !esDescripcion) {
      return;
    }

    const llaveActual = `${esNombre}|${esDescripcion}`;
    if (
      llaveActual === this.ultimaLlaveTraduccionActividad &&
      Object.keys(this.concentradoTraduccionesActividad).length > 0
    ) {
      return;
    }

    const response = await fetch(
      'https://script.google.com/macros/s/AKfycbwJ64gxjQiSsfZzixzr0tIe1na6tM81oAAW9Cjt8uuI53DDSaaAn_UMl2zgU69ZYyg3/exec',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          title: esNombre ?? '',
          description: esDescripcion ?? ''
        })
      }
    );

    if (!response.ok) {
      throw new Error('No se pudo traducir la actividad.');
    }

    const data = await response.json();
    const traducciones = data?.data;

    if (!traducciones || typeof traducciones !== 'object') {
      return;
    }

    const concentrado = this.idiomas.reduce((acc, idioma) => {
      const traduccionIdioma = traducciones?.[idioma.codigo];
      if (!traduccionIdioma) {
        return acc;
      }

      acc[idioma.codigo] = {
        nombre: typeof traduccionIdioma.title === 'string' ? traduccionIdioma.title : '',
        descripcion:
          typeof traduccionIdioma.description === 'string' ? traduccionIdioma.description : ''
      };

      return acc;
    }, {} as Record<string, { nombre: string; descripcion: string }>);

    this.concentradoTraduccionesActividad = concentrado;

    this.idiomas.forEach((idioma) => {
      const traduccionIdioma = concentrado?.[idioma.codigo];
      if (!traduccionIdioma) {
        return;
      }

      this.formActividad.get(['traducciones', idioma.codigo, 'nombre'])?.setValue(traduccionIdioma.nombre);
      this.formActividad
        .get(['traducciones', idioma.codigo, 'descripcion'])
        ?.setValue(traduccionIdioma.descripcion);
    });

    this.ultimaLlaveTraduccionActividad = llaveActual;
  }

  abrirModalConfirmarEliminarActividad(index: number) {
    this.indiceActividadAEliminar = index;
    this.mostrarModalConfirmarEliminarActividad = true;
  }

  cerrarModalConfirmarEliminarActividad() {
    this.mostrarModalConfirmarEliminarActividad = false;
    this.indiceActividadAEliminar = null;
  }

  async confirmarEliminarActividad() {
    if (this.indiceActividadAEliminar === null) {
      return;
    }

    const index = this.indiceActividadAEliminar;
    await this.eliminarActividad(index);
    if (this.eliminandoActividadIndex === null) {
      this.cerrarModalConfirmarEliminarActividad();
    }
  }

  private async eliminarActividad(index: number) {
    const actividad = this.actividadesArray.at(index);
    if (!actividad) {
      return;
    }

    if (this.eliminandoActividadIndex !== null) {
      return;
    }

    this.error = '';
    this.eliminandoActividadIndex = index;

    try {
      const actividadId = this.parseNumber(actividad.get('id')?.value);
      if (actividadId) {
        await this.actividadesService.eliminarActividadDestinoAdmin({
          destino_id: this.destinoId,
          actividad_id: actividadId
        });
      }

      this.actividadesArray.removeAt(index);

      if (this.indiceActividadEditando === index) {
        this.cerrarModalActividad();
      } else if (
        this.indiceActividadEditando !== null &&
        this.indiceActividadEditando > index
      ) {
        this.indiceActividadEditando -= 1;
      }
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo eliminar la actividad.';
    } finally {
      this.eliminandoActividadIndex = null;
    }
  }

  get catalogoDisponibleParaNuevo() {
    const usados = new Set(
      this.detallesRapidosArray.controls.map((detalle) => Number(detalle.get('tipo_dato_rapido_id')?.value))
    );
    return this.catalogoTiposDatoRapido.filter((item) => !usados.has(Number(item.id)));
  }

  guardarUbicacion(): Promise<boolean> {
    if (this.guardadoUbicacionPendiente) {
      return this.guardadoUbicacionPendiente;
    }

    this.guardadoUbicacionPendiente = this.persistirUbicacion();
    return this.guardadoUbicacionPendiente;
  }

  private async persistirUbicacion(): Promise<boolean> {
    if (!this.destinoId) {
      return false;
    }

    this.guardandoUbicacion = true;
    this.error = '';

    try {
      await this.destinosService.actualizarUbicacionDestinoAdmin(
        this.destinoId,
        this.limpiarTexto(this.form.get('ubicacion')?.value)
      );
      return true;
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo actualizar la ubicación.';
      this.toast.show({ title: 'No se pudo actualizar la ubicación', message: this.error, variant: 'error' });
      return false;
    } finally {
      this.guardandoUbicacion = false;
      this.guardadoUbicacionPendiente = null;
    }
  }

  get opcionesCatalogoDatoRapido(): TpSelectSearchOption[] {
    return this.catalogoDisponibleParaNuevo.map((tipo) => ({
      value: tipo.id,
      label: tipo.nombre
    }));
  }

  dropDetalleRapido(event: CdkDragDrop<any[]>) {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const control = this.detallesRapidosArray;
    const moving = control.at(event.previousIndex);
    control.removeAt(event.previousIndex);
    control.insert(event.currentIndex, moving);
    this.normalizarOrdenDetallesRapidos();
  }

  async actualizarOrdenDetallesRapidos() {
    if (this.actualizandoOrden) {
      return;
    }

    this.actualizandoOrden = true;
    this.error = '';

    try {
      this.normalizarOrdenDetallesRapidos();
      const payload = this.detallesRapidosArray.controls.map((detalle, index) => ({
        tipo_dato_rapido_id: Number(detalle.get('tipo_dato_rapido_id')?.value),
        orden: index + 1
      }));

      const resultado = await this.destinosService.actualizarOrdenDatosRapidosDestinoAdmin(this.destinoId, payload);
      if (resultado.updated === 0) {
        this.error = 'Primero guarda el preview para crear los detalles rapidos y despues actualizar el orden.';
        return;
      }

      this.mensajeModalExito = 'Orden de detalles del destino actualizado correctamente.';
      this.mostrarModalExito = true;
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo actualizar el orden de los detalles.';
    } finally {
      this.actualizandoOrden = false;
    }
  }

  abrirModalNuevoDatoRapido() {
    this.error = '';
    if (!this.catalogoDisponibleParaNuevo.length) {
      this.error = 'No hay mas tipos de dato rapido disponibles para agregar.';
      return;
    }

    this.formNuevoDatoRapido.reset({
      tipo_dato_rapido_id: this.catalogoDisponibleParaNuevo[0]?.id ?? null
    });
    this.formNuevoDatoRapido.setControl('valores', this.buildValoresGroup(undefined, true));
    this.mostrarModalNuevoDatoRapido = true;
  }

  cerrarModalNuevoDatoRapido() {
    this.mostrarModalNuevoDatoRapido = false;
  }

  async crearNuevoDatoRapido() {
    if (this.formNuevoDatoRapido.invalid) {
      this.formNuevoDatoRapido.markAllAsTouched();
      return;
    }

    if (this.agregandoDatoRapido) {
      return;
    }

    this.agregandoDatoRapido = true;
    this.error = '';

    try {
      const raw = this.formNuevoDatoRapido.getRawValue();
      const tipoId = Number(raw.tipo_dato_rapido_id);
      const seleccionado = this.catalogoTiposDatoRapido.find((item) => Number(item.id) === tipoId);

      if (!seleccionado) {
        this.error = 'Selecciona un tipo de dato rapido valido.';
        return;
      }

      const usados = new Set(
        this.detallesRapidosArray.controls.map((detalle) => Number(detalle.get('tipo_dato_rapido_id')?.value))
      );
      if (usados.has(tipoId)) {
        this.error = 'Ese tipo de dato rapido ya fue agregado.';
        return;
      }

      const valores = await this.traducirValorRapidoDesdeEspanol(raw?.valores?.es);
      const nuevo = this.buildDetalleRapidoGroup(
        {
          tipo_dato_rapido_id: seleccionado.id,
          nombre: seleccionado.nombre,
          clave: seleccionado.clave,
          orden: this.detallesRapidosArray.length + 1,
          valores
        },
        this.detallesRapidosArray.length
      );
      this.detallesRapidosArray.push(nuevo);
      this.normalizarOrdenDetallesRapidos();

      if (await this.guardar(false)) {
        this.mostrarModalNuevoDatoRapido = false;
      }
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo traducir y guardar el dato rapido.';
    } finally {
      this.agregandoDatoRapido = false;
    }
  }

  async alternarActivoDatoRapido(index: number): Promise<void> {
    const detalle = this.detallesRapidosArray.at(index);
    const detalleRapidoId = this.parseNumber(detalle?.get('id')?.value);
    if (!detalle || !detalleRapidoId || this.cambiandoActivoDatoRapidoId !== null) {
      return;
    }

    this.cambiandoActivoDatoRapidoId = detalleRapidoId;
    this.error = '';
    const activoActual = Boolean(detalle.get('activo')?.value);
    const nombre = detalle.get('nombre')?.value ?? 'Dato rápido';

    try {
      const activo = await this.destinosService.actualizarActivoDatoRapidoDestinoAdmin(
        detalleRapidoId,
        !activoActual
      );
      detalle.get('activo')?.setValue(activo);
      this.toast.show({
        title: activo ? 'Dato rápido activado' : 'Dato rápido desactivado',
        message: activo
          ? `${nombre} ya es visible para los viajeros.`
          : `${nombre} dejó de mostrarse en la vista pública.`,
        variant: activo ? 'success' : 'warning'
      });
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo actualizar el estado del dato rápido.';
      this.toast.show({ title: 'No se pudo actualizar', message: this.error, variant: 'error' });
    } finally {
      this.cambiandoActivoDatoRapidoId = null;
    }
  }

  abrirModalConfirmarEliminarDatoRapido(index: number): void {
    this.indiceDatoRapidoAEliminar = index;
    this.mostrarModalConfirmarEliminarDatoRapido = true;
  }

  cerrarModalConfirmarEliminarDatoRapido(): void {
    this.mostrarModalConfirmarEliminarDatoRapido = false;
    this.indiceDatoRapidoAEliminar = null;
  }

  async confirmarEliminarDatoRapido(): Promise<void> {
    if (this.indiceDatoRapidoAEliminar === null) {
      return;
    }

    const eliminado = await this.eliminarDatoRapido(this.indiceDatoRapidoAEliminar);
    if (eliminado) {
      this.cerrarModalConfirmarEliminarDatoRapido();
    }
  }

  private async eliminarDatoRapido(index: number): Promise<boolean> {
    const detalle = this.detallesRapidosArray.at(index);
    const detalleRapidoId = this.parseNumber(detalle?.get('id')?.value);
    if (!detalle || !detalleRapidoId || this.eliminandoDatoRapidoId !== null) {
      return false;
    }

    this.eliminandoDatoRapidoId = detalleRapidoId;
    this.error = '';

    try {
      const nombre = detalle.get('nombre')?.value ?? 'Dato rápido';
      await this.destinosService.eliminarDatoRapidoDestinoAdmin(this.destinoId, detalleRapidoId);
      this.detallesRapidosArray.removeAt(index);
      this.normalizarOrdenDetallesRapidos();
      this.toast.show({
        title: 'Dato rápido eliminado',
        message: `${nombre} fue eliminado del preview.`,
        variant: 'success'
      });
      return true;
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo eliminar el dato rápido.';
      this.toast.show({ title: 'No se pudo eliminar', message: this.error, variant: 'error' });
      return false;
    } finally {
      this.eliminandoDatoRapidoId = null;
    }
  }

  abrirModalEditarDatoRapido(index: number) {
    const detalle = this.detallesRapidosArray.at(index);
    if (!detalle) {
      return;
    }

    this.indiceDatoRapidoEditando = index;
    this.formEditarDatoRapido.patchValue({
      nombre: detalle.get('nombre')?.value ?? ''
    });

    const valoresForm = this.buildValoresGroup(
      { es: detalle.get('valores')?.get('es')?.value ?? '' },
      true
    );
    this.formEditarDatoRapido.setControl('valores', valoresForm);
    this.mostrarModalEditarDatoRapido = true;
  }

  cerrarModalEditarDatoRapido() {
    this.mostrarModalEditarDatoRapido = false;
    this.indiceDatoRapidoEditando = null;
  }

  async guardarEdicionDatoRapido(): Promise<void> {
    if (this.indiceDatoRapidoEditando === null) {
      return;
    }

    if (this.formEditarDatoRapido.invalid) {
      this.formEditarDatoRapido.markAllAsTouched();
      return;
    }

    const detalle = this.detallesRapidosArray.at(this.indiceDatoRapidoEditando);
    if (!detalle) {
      return;
    }

    try {
      const raw = this.formEditarDatoRapido.getRawValue();
      const valores = await this.traducirValorRapidoDesdeEspanol(raw?.valores?.es);
      this.idiomas.forEach((idioma) => {
        detalle.get('valores')?.get(idioma.codigo)?.setValue(valores[idioma.codigo] ?? '');
      });
      this.cerrarModalEditarDatoRapido();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo traducir el dato rápido.';
    }
  }

  private inicializarFormulario(data: IPreviewDestinoAdmin) {
    this.destinoNombre = data.destino_nombre;
    this.idiomas = this.ordenarIdiomas(data.idiomas);
    this.catalogoAtracciones = data.catalogo_atracciones ?? [];
    const catalogoUnico = new Map<number, { id: number; clave: string; nombre: string }>();
    data.catalogo_tipos_dato_rapido.forEach((item) => {
      const id = Number(item.id);
      if (!Number.isFinite(id) || catalogoUnico.has(id)) {
        return;
      }

      catalogoUnico.set(id, {
        id,
        clave: item.clave,
        nombre: item.nombre
      });
    });
    this.catalogoTiposDatoRapido = Array.from(catalogoUnico.values());

    const traducciones = this.idiomas.map((idioma) => {
      const traduccion = data.traducciones.find((item) => item.idioma_id === idioma.id);

      return this.fb.group({
        idioma_id: [idioma.id],
        codigo: [idioma.codigo],
        nombre: [traduccion?.nombre ?? '', idioma.codigo === 'es' ? [Validators.required] : []],
        descripcion_corta: [traduccion?.descripcion_corta ?? '', idioma.codigo === 'es' ? [Validators.required] : []],
        descripcion_larga: [traduccion?.descripcion_larga ?? '', idioma.codigo === 'es' ? [Validators.required] : []],
        titulo_descripcion: [traduccion?.titulo_descripcion ?? '', idioma.codigo === 'es' ? [Validators.required] : []]
      });
    });

    const detallesRapidos = data.detalles_rapidos.map((item, index) => this.buildDetalleRapidoGroup(item, index));
    const actividades = (data.actividades ?? []).map((item) => this.buildActividadGroup(item));

    this.form.setControl('traducciones', this.fb.array(traducciones));
    this.form.setControl('detallesRapidos', this.fb.array(detallesRapidos));
    this.form.setControl('actividades', this.fb.array(actividades));
    this.form.patchValue({
      ubicacion: data.ubicacion ?? ''
    });
    this.ultimaLlaveTraduccionTextoPreview = JSON.stringify(this.obtenerTextosPreviewEspanol());
  }

  private buildDetalleRapidoGroup(item: any, index: number) {
    return this.fb.group({
      id: [this.parseNumber(item.id)],
      activo: [item.activo !== false],
      tipo_dato_rapido_id: [Number(item.tipo_dato_rapido_id)],
      nombre: [item.nombre || item.clave],
      clave: [item.clave],
      orden: [item.orden ?? index + 1],
      valores: this.buildValoresGroup(
        this.idiomas.reduce((acc, idioma) => {
          acc[idioma.codigo] = item?.valores?.[idioma.id] ?? item?.valores?.[idioma.codigo] ?? '';
          return acc;
        }, {} as Record<string, string>)
      )
    });
  }

  private normalizarOrdenDetallesRapidos() {
    this.detallesRapidosArray.controls.forEach((detalle, index) => {
      detalle.get('orden')?.setValue(index + 1, { emitEvent: false });
    });
  }

  private buildActividadGroup(item: any) {
    const traducciones = this.idiomas.reduce((acc, idioma) => {
      const nombre =
        item?.traducciones?.[idioma.id]?.nombre ??
        item?.traducciones?.[idioma.codigo]?.nombre ??
        '';
      const descripcion =
        item?.traducciones?.[idioma.id]?.descripcion ??
        item?.traducciones?.[idioma.codigo]?.descripcion ??
        '';

      acc[idioma.codigo] = this.fb.group({
        nombre: [nombre],
        descripcion: [descripcion]
      });
      return acc;
    }, {} as Record<string, any>);

    const imagenes = this.normalizarImagenesActividadPayload(item?.imagenes ?? []);

    return this.fb.group({
      id: [this.parseNumber(item?.id)],
      catalogo_atraccion_id: [this.parseNumber(item?.catalogo_atraccion_id)],
      tipo_actividad: [item?.tipo_actividad ?? ''],
      imagen_fondo: [item?.imagen_fondo ?? ''],
      imagenes: this.buildImagenesFormArray(imagenes),
      traducciones: this.fb.group(traducciones)
    });
  }

  private buildImagenesFormArray(imagenes: Array<any> = []): UntypedFormArray {
    return this.fb.array(
      imagenes.map((imagen, index) =>
        this.fb.group({
          id: [this.parseNumber(imagen?.id)],
          imagen_url: [imagen?.imagen_url ?? ''],
          activa: [Boolean(imagen?.activa)],
          orden: [Number.isFinite(Number(imagen?.orden)) ? Number(imagen.orden) : index + 1],
          vigencia_desde: [imagen?.vigencia_desde ?? null],
          vigencia_hasta: [imagen?.vigencia_hasta ?? null],
          created_at: [imagen?.created_at ?? null]
        })
      )
    );
  }

  private normalizarImagenesActividadPayload(imagenes: Array<any> = []) {
    return (imagenes ?? [])
      .map((imagen, index) => ({
        id: this.parseNumber(imagen?.id),
        imagen_url: this.limpiarTexto(imagen?.imagen_url),
        activa: Boolean(imagen?.activa),
        orden: this.parseNumber(imagen?.orden) ?? index + 1,
        vigencia_desde: this.normalizarFechaYYYYMMDD(imagen?.vigencia_desde),
        vigencia_hasta: this.normalizarFechaYYYYMMDD(imagen?.vigencia_hasta),
        created_at: imagen?.created_at ?? null
      }))
      .filter((imagen) => !!imagen.imagen_url);
  }

  private obtenerImagenPrincipalGaleria(
    imagenes?: Array<{
      imagen_url: string | null;
      activa?: boolean;
      orden?: number | null;
      vigencia_desde?: string | null;
      vigencia_hasta?: string | null;
    }>,
    fallback = ''
  ): string {
    const lista = this.normalizarImagenesActividadPayload(imagenes ?? []);
    if (!lista.length) {
      return this.limpiarTexto(fallback) ?? '';
    }

    const hoy = this.obtenerFechaMexicoHoy();
    const vigentes = lista.filter((imagen) => this.imagenEstaVigente(imagen, hoy));
    const candidataVigente = vigentes.find((imagen) => imagen.activa) ?? vigentes[0] ?? null;
    const candidataActiva = lista.find((imagen) => imagen.activa) ?? null;
    const candidataOrden = [...lista].sort((a, b) => {
      const ordenA = Number(a.orden ?? Number.MAX_SAFE_INTEGER);
      const ordenB = Number(b.orden ?? Number.MAX_SAFE_INTEGER);
      if (ordenA !== ordenB) {
        return ordenA - ordenB;
      }
      return Number(a.id ?? 0) - Number(b.id ?? 0);
    })[0] ?? null;

    return candidataVigente?.imagen_url ?? candidataActiva?.imagen_url ?? candidataOrden?.imagen_url ?? this.limpiarTexto(fallback) ?? '';
  }

  private normalizarFechaYYYYMMDD(value: string | Date | null | undefined): string | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        return null;
      }

      return value.toISOString().slice(0, 10);
    }

    const texto = String(value).trim();
    return texto ? texto.slice(0, 10) : null;
  }

  private obtenerFechaMexicoHoy(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  }

  private imagenEstaVigente(
    imagen: { vigencia_desde?: string | null; vigencia_hasta?: string | null },
    fechaReferencia: string
  ): boolean {
    const desde = this.normalizarFechaYYYYMMDD(imagen?.vigencia_desde);
    const hasta = this.normalizarFechaYYYYMMDD(imagen?.vigencia_hasta);

    if (!desde && !hasta) {
      return false;
    }

    if (desde && fechaReferencia < desde) {
      return false;
    }

    if (hasta && fechaReferencia > hasta) {
      return false;
    }

    return true;
  }

  private moverImagenActividad(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= this.imagenesActividadArray.length) {
      return;
    }

    const control = this.imagenesActividadArray;
    const current = control.at(index);
    control.removeAt(index);
    control.insert(target, current);
    this.normalizarOrdenImagenesActividad();
  }

  private eliminarImagenActividad(index: number) {
    if (index < 0 || index >= this.imagenesActividadArray.length) {
      return;
    }

    this.imagenesActividadArray.removeAt(index);
    this.normalizarOrdenImagenesActividad();
  }

  private agregarImagenActividad() {
    this.imagenesActividadArray.push(
      this.fb.group({
        id: [null],
        imagen_url: [''],
        activa: [false],
        orden: [this.imagenesActividadArray.length + 1],
        vigencia_desde: [null],
        vigencia_hasta: [null],
        created_at: [null]
      })
    );
  }

  private setImagenActiva(index: number) {
    this.imagenesActividadArray.controls.forEach((control, currentIndex) => {
      control.get('activa')?.setValue(currentIndex === index, { emitEvent: false });
    });

    const imagenSeleccionada = this.imagenesActividadArray.at(index);
    const url = String(imagenSeleccionada?.get('imagen_url')?.value ?? '').trim();
    if (url) {
      this.formActividad.get('imagen_fondo')?.setValue(url, { emitEvent: false });
    }
  }

  private normalizarOrdenImagenesActividad() {
    this.imagenesActividadArray.controls.forEach((control, index) => {
      control.get('orden')?.setValue(index + 1, { emitEvent: false });
    });

    const existeActiva = this.imagenesActividadArray.controls.some(
      (control) => Boolean(control.get('activa')?.value)
    );
    if (!existeActiva && this.imagenesActividadArray.length > 0) {
      this.imagenesActividadArray.at(0)?.get('activa')?.setValue(true, { emitEvent: false });
    }
  }

  private async traducirValorRapidoDesdeEspanol(valor: string | null | undefined): Promise<Record<string, string>> {
    const valorEspanol = this.limpiarTexto(valor);
    if (!valorEspanol) {
      throw new Error('Ingresa el valor en espanol para continuar.');
    }

    const traducciones = await this.traduccionesService.traducirDesdeEspanol({
      title: '',
      description: valorEspanol
    });

    return this.idiomas.reduce((valores, idioma) => {
      valores[idioma.codigo] = idioma.codigo === 'es'
        ? valorEspanol
        : this.limpiarTexto(traducciones?.[idioma.codigo]?.description) ?? '';
      return valores;
    }, {} as Record<string, string>);
  }

  private async traducirTextoPreviewDesdeEspanol(textos: {
    nombre: string;
    titulo_descripcion: string;
    descripcion_corta: string;
    descripcion_larga: string;
  }): Promise<void> {
    const [nombreTraducido, encabezadoTraducido, descripcionLargaTraducida] = await Promise.all([
      this.traduccionesService.traducirDesdeEspanol({ title: textos.nombre, description: '' }),
      this.traduccionesService.traducirDesdeEspanol({
        title: textos.titulo_descripcion,
        description: textos.descripcion_corta
      }),
      this.traduccionesService.traducirDesdeEspanol({ title: '', description: textos.descripcion_larga })
    ]);

    this.idiomas.forEach((idioma, index) => {
      const traduccion = this.traduccionesArray.at(index);
      if (!traduccion) {
        return;
      }

      if (idioma.codigo === 'es') {
        traduccion.patchValue(textos);
        return;
      }

      traduccion.patchValue({
        nombre: this.limpiarTexto(nombreTraducido?.[idioma.codigo]?.title) ?? '',
        titulo_descripcion: this.limpiarTexto(encabezadoTraducido?.[idioma.codigo]?.title) ?? '',
        descripcion_corta: this.limpiarTexto(encabezadoTraducido?.[idioma.codigo]?.description) ?? '',
        descripcion_larga: this.limpiarTexto(descripcionLargaTraducida?.[idioma.codigo]?.description) ?? ''
      });
    });
  }

  private obtenerTextosPreviewEspanol() {
    const traduccionEspanol = this.traduccionesArray.at(this.indiceEspanol);
    return {
      nombre: this.limpiarTexto(traduccionEspanol?.get('nombre')?.value) ?? '',
      titulo_descripcion: this.limpiarTexto(traduccionEspanol?.get('titulo_descripcion')?.value) ?? '',
      descripcion_corta: this.limpiarTexto(traduccionEspanol?.get('descripcion_corta')?.value) ?? '',
      descripcion_larga: this.limpiarTexto(traduccionEspanol?.get('descripcion_larga')?.value) ?? ''
    };
  }

  private buildValoresGroup(initial?: Record<string, string>, requerirEspanol = false) {
    const valores = this.idiomas.reduce((acc, idioma) => {
      acc[idioma.codigo] = [initial?.[idioma.codigo] ?? '', ...(requerirEspanol && idioma.codigo === 'es' ? [Validators.required] : [])];
      return acc;
    }, {} as Record<string, any>);

    return this.fb.group(valores);
  }

  private ordenarIdiomas(idiomas: IIdiomaPreviewAdmin[]): IIdiomaPreviewAdmin[] {
    const mapByCode = new Map(idiomas.map((item) => [item.codigo, item]));
    return this.idiomasConfig
      .map((config) => mapByCode.get(config.code))
      .filter((item): item is IIdiomaPreviewAdmin => !!item);
  }

  private limpiarTexto(value: string | null | undefined): string | null {
    const limpio = (value ?? '').trim();
    return limpio ? limpio : null;
  }

  private normalizarTextoFiltro(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase()
      .trim();
  }

  private parseNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  private existeModalAbierto(): boolean {
    return (
      this.mostrarModalExito ||
      this.mostrarModalEditarDatoRapido ||
      this.mostrarModalNuevoDatoRapido ||
      this.mostrarModalEditarActividad ||
      this.mostrarModalNuevaActividad ||
      this.mostrarModalConfirmarEliminarActividad ||
      this.mostrarModalConfirmarEliminarDatoRapido
    );
  }

  private bloquearScrollBody(bloquear: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (bloquear) {
      if (this.scrollBodyBloqueado) {
        return;
      }

      this.bodyOverflowOriginal = document.body.style.overflow;
      this.bodyPaddingRightOriginal = document.body.style.paddingRight;

      const anchoScrollbar = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (anchoScrollbar > 0) {
        document.body.style.paddingRight = `${anchoScrollbar}px`;
      }

      this.scrollBodyBloqueado = true;
      return;
    }

    if (!this.scrollBodyBloqueado) {
      return;
    }

    document.body.style.overflow = this.bodyOverflowOriginal;
    document.body.style.paddingRight = this.bodyPaddingRightOriginal;
    this.scrollBodyBloqueado = false;
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
      this.mapaUbicacion = this.L.map(element).setView(
        [coordenadas.lat, coordenadas.lng],
        EditarPreviewDestinoComponent.ZOOM_VISTA_LEJANA
      );
      this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.mapaUbicacion);

      const icon = this.L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      this.marcadorUbicacion = this.L.marker([coordenadas.lat, coordenadas.lng], { icon })
        .addTo(this.mapaUbicacion)
        .bindTooltip('Ubicacion del destino', { permanent: true, direction: 'top', offset: [0, -40] });
    } else {
      this.mapaUbicacion.setView(
        [coordenadas.lat, coordenadas.lng],
        EditarPreviewDestinoComponent.ZOOM_VISTA_LEJANA
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
