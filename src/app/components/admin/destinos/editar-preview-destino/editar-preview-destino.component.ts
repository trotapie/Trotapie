import { AfterViewInit, Component, DoCheck, ElementRef, ViewChild, inject, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormArray, UntypedFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';
import {
  IIdiomaPreviewAdmin,
  IPreviewDestinoAdmin,
  SupabaseService
} from 'app/core/supabase.service';
import { MaterialModule } from 'app/shared/material.module';

interface ILangConfig {
  code: string;
  label: string;
}

@Component({
  selector: 'app-editar-preview-destino',
  standalone: true,
  imports: [MaterialModule, DragDropModule],
  templateUrl: './editar-preview-destino.component.html',
  styleUrl: './editar-preview-destino.component.scss'
})
export class EditarPreviewDestinoComponent implements OnInit, AfterViewInit {
  private static readonly ZOOM_VISTA_LEJANA = 12;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);
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
  actualizandoOrden = false;
  error = '';
  mostrarModalExito = false;
  mensajeModalExito = 'Preview del destino actualizado correctamente.';
  mostrarModalEditarDatoRapido = false;
  mostrarModalNuevoDatoRapido = false;
  mostrarModalEditarTextoPreview = false;
  mostrarModalEditarActividad = false;
  mostrarModalNuevaActividad = false;
  mostrarModalConfirmarEliminarActividad = false;
  guardandoActividad = false;
  traduciendoActividad = false;
  eliminandoActividadIndex: number | null = null;
  indiceActividadAEliminar: number | null = null;
  indiceDatoRapidoEditando: number | null = null;
  indiceTraduccionEditando: number | null = null;
  indiceActividadEditando: number | null = null;
  concentradoTraduccionesActividad: Record<string, { nombre: string; descripcion: string }> = {};
  private ultimaLlaveTraduccionActividad = '';
  private modalAbiertoPrevio = false;
  private bodyOverflowOriginal = '';
  private bodyPaddingRightOriginal = '';
  private scrollBodyBloqueado = false;
  private ubicacionSub?: Subscription;
  private mapaUbicacion?: L.Map;
  private marcadorUbicacion?: L.Marker;

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

  formEditarTextoPreview = this.fb.group({
    idioma: [{ value: '', disabled: true }],
    nombre: ['', [Validators.required]],
    titulo_descripcion: ['', [Validators.required]],
    descripcion_corta: ['', [Validators.required]],
    descripcion_larga: ['', [Validators.required]]
  });

  formActividad = this.fb.group({
    imagen_fondo: ['', [Validators.required]],
    traducciones: this.fb.group({})
  });

  get traduccionesArray(): UntypedFormArray {
    return this.form.get('traducciones') as UntypedFormArray;
  }

  get detallesRapidosArray(): UntypedFormArray {
    return this.form.get('detallesRapidos') as UntypedFormArray;
  }

  get actividadesArray(): UntypedFormArray {
    return this.form.get('actividades') as UntypedFormArray;
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
      const data = await this.supabase.obtenerPreviewDestinoAdmin(id);
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

  async guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando = true;
    this.error = '';

    try {
      const raw = this.form.getRawValue();
      const detallesRapidos = (raw.detallesRapidos ?? []).map((item: any, index: number) => ({
        tipo_dato_rapido_id: Number(item.tipo_dato_rapido_id),
        orden: Number(item.orden ?? index + 1),
        valores: this.idiomas.map((idioma) => ({
          idioma_id: idioma.id,
          valor: this.limpiarTexto(item?.valores?.[idioma.codigo])
        }))
      }));

      await this.supabase.guardarPreviewDestinoAdmin({
        destino_id: this.destinoId,
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
        actividades: (raw.actividades ?? []).map((actividad: any) => ({
          id: this.parseNumber(actividad.id),
          imagen_fondo: this.limpiarTexto(actividad.imagen_fondo),
          traducciones: this.idiomas.map((idioma) => ({
            idioma_id: idioma.id,
            nombre: this.limpiarTexto(actividad?.traducciones?.[idioma.codigo]?.nombre),
            descripcion: this.limpiarTexto(actividad?.traducciones?.[idioma.codigo]?.descripcion)
          }))
        }))
      });

      this.mensajeModalExito = 'Preview del destino actualizado correctamente.';
      this.mostrarModalExito = true;
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo guardar el preview del destino.';
    } finally {
      this.guardando = false;
    }
  }

  regresar() {
    this.router.navigate(['/admin/destinos/configurar-destinos']);
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

  getNombreIdioma(codigo: string): string {
    return this.idiomasConfig.find((item) => item.code === codigo)?.label ?? codigo.toUpperCase();
  }


  abrirModalEditarTextoPreview(index: number) {
    const traduccion = this.traduccionesArray.at(index);
    if (!traduccion) {
      return;
    }

    this.indiceTraduccionEditando = index;
    this.formEditarTextoPreview.patchValue({
      idioma: this.getNombreIdioma(String(traduccion.get('codigo')?.value ?? '')),
      nombre: traduccion.get('nombre')?.value ?? '',
      titulo_descripcion: traduccion.get('titulo_descripcion')?.value ?? '',
      descripcion_corta: traduccion.get('descripcion_corta')?.value ?? '',
      descripcion_larga: traduccion.get('descripcion_larga')?.value ?? ''
    });
    this.mostrarModalEditarTextoPreview = true;
  }

  cerrarModalEditarTextoPreview() {
    this.mostrarModalEditarTextoPreview = false;
    this.indiceTraduccionEditando = null;
  }

  guardarEdicionTextoPreview() {
    if (this.formEditarTextoPreview.invalid || this.indiceTraduccionEditando === null) {
      this.formEditarTextoPreview.markAllAsTouched();
      return;
    }

    const traduccion = this.traduccionesArray.at(this.indiceTraduccionEditando);
    if (!traduccion) {
      return;
    }

    const raw = this.formEditarTextoPreview.getRawValue();
    traduccion.patchValue({
      nombre: raw.nombre ?? '',
      titulo_descripcion: raw.titulo_descripcion ?? '',
      descripcion_corta: raw.descripcion_corta ?? '',
      descripcion_larga: raw.descripcion_larga ?? ''
    });

    this.cerrarModalEditarTextoPreview();
  }

  abrirModalNuevaActividad() {
    const traducciones = this.idiomas.reduce((acc, idioma) => {
      acc[idioma.codigo] = this.fb.group({
        nombre: [''],
        descripcion: ['']
      });
      return acc;
    }, {} as Record<string, any>);

    this.formActividad.reset({ imagen_fondo: '' });
    this.formActividad.setControl('traducciones', this.fb.group(traducciones));
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
      imagen_fondo: actividad.get('imagen_fondo')?.value ?? ''
    });
    this.formActividad.setControl('traducciones', this.fb.group(traducciones));
    this.concentradoTraduccionesActividad = {};
    this.ultimaLlaveTraduccionActividad = '';
    this.indiceActividadEditando = index;
    this.mostrarModalEditarActividad = true;
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

      const guardada = await this.supabase.guardarActividadDestinoAdmin({
        destino_id: this.destinoId,
        actividad_id: actividadId,
        imagen_fondo: this.limpiarTexto(raw.imagen_fondo),
        traducciones: this.idiomas.map((idioma) => ({
          idioma_id: idioma.id,
          nombre: this.limpiarTexto(raw?.traducciones?.[idioma.codigo]?.nombre),
          descripcion: this.limpiarTexto(raw?.traducciones?.[idioma.codigo]?.descripcion)
        }))
      });

      if (actividadExistente) {
        actividadExistente.patchValue({
          id: guardada.id,
          imagen_fondo: raw.imagen_fondo ?? ''
        });

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
          imagen_fondo: raw.imagen_fondo ?? '',
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
        await this.supabase.eliminarActividadDestinoAdmin({
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

      const resultado = await this.supabase.actualizarOrdenDatosRapidosDestinoAdmin(this.destinoId, payload);
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
    this.formNuevoDatoRapido.setControl('valores', this.buildValoresGroup());
    this.mostrarModalNuevoDatoRapido = true;
  }

  cerrarModalNuevoDatoRapido() {
    this.mostrarModalNuevoDatoRapido = false;
  }

  crearNuevoDatoRapido() {
    if (this.formNuevoDatoRapido.invalid) {
      this.formNuevoDatoRapido.markAllAsTouched();
      return;
    }

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

    const nuevo = this.buildDetalleRapidoGroup(
      {
        tipo_dato_rapido_id: seleccionado.id,
        nombre: seleccionado.nombre,
        clave: seleccionado.clave,
        orden: this.detallesRapidosArray.length + 1,
        valores: raw.valores ?? {}
      },
      this.detallesRapidosArray.length
    );
    this.detallesRapidosArray.push(nuevo);
    this.normalizarOrdenDetallesRapidos();
    this.mostrarModalNuevoDatoRapido = false;
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
      this.idiomas.reduce((acc, idioma) => {
        acc[idioma.codigo] = detalle.get('valores')?.get(idioma.codigo)?.value ?? '';
        return acc;
      }, {} as Record<string, string>)
    );
    this.formEditarDatoRapido.setControl('valores', valoresForm);
    this.mostrarModalEditarDatoRapido = true;
  }

  cerrarModalEditarDatoRapido() {
    this.mostrarModalEditarDatoRapido = false;
    this.indiceDatoRapidoEditando = null;
  }

  guardarEdicionDatoRapido() {
    if (this.indiceDatoRapidoEditando === null) {
      return;
    }

    const detalle = this.detallesRapidosArray.at(this.indiceDatoRapidoEditando);
    if (!detalle) {
      return;
    }

    const raw = this.formEditarDatoRapido.getRawValue();
    const valores = raw.valores ?? {};
    this.idiomas.forEach((idioma) => {
      detalle.get('valores')?.get(idioma.codigo)?.setValue(valores[idioma.codigo] ?? '');
    });

    this.cerrarModalEditarDatoRapido();
  }

  private inicializarFormulario(data: IPreviewDestinoAdmin) {
    this.destinoNombre = data.destino_nombre;
    this.idiomas = this.ordenarIdiomas(data.idiomas);
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
        nombre: [traduccion?.nombre ?? '', [Validators.required]],
        descripcion_corta: [traduccion?.descripcion_corta ?? '', [Validators.required]],
        descripcion_larga: [traduccion?.descripcion_larga ?? '', [Validators.required]],
        titulo_descripcion: [traduccion?.titulo_descripcion ?? '', [Validators.required]]
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
  }

  private buildDetalleRapidoGroup(item: any, index: number) {
    return this.fb.group({
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

    return this.fb.group({
      id: [this.parseNumber(item?.id)],
      imagen_fondo: [item?.imagen_fondo ?? '', [Validators.required]],
      traducciones: this.fb.group(traducciones)
    });
  }

  private buildValoresGroup(initial?: Record<string, string>) {
    const valores = this.idiomas.reduce((acc, idioma) => {
      acc[idioma.codigo] = [initial?.[idioma.codigo] ?? ''];
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
      this.mostrarModalEditarTextoPreview ||
      this.mostrarModalEditarActividad ||
      this.mostrarModalNuevaActividad ||
      this.mostrarModalConfirmarEliminarActividad
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
      this.mapaUbicacion = L.map(element).setView(
        [coordenadas.lat, coordenadas.lng],
        EditarPreviewDestinoComponent.ZOOM_VISTA_LEJANA
      );
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
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
