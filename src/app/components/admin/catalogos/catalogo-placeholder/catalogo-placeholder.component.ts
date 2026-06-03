import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, inject, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogoAdminKey, CatalogosAdminService, IPoliticaTarifaAdmin } from 'app/core/catalogos-admin.service';
import { SupabaseService } from 'app/core/supabase.service';
import { EstatusComponent } from 'app/shared/estatus/estatus.component';
import { MaterialModule } from 'app/shared/material.module';

interface IPoliticaTraduccionPreview {
  titulo: string;
  descripcion: string;
}

interface CatalogoColumna {
  key: string;
  label: string;
}

interface CatalogoVistaConfig {
  columnas: CatalogoColumna[];
  tieneOrden: boolean;
  editableKeys: string[];
  booleanKeys?: string[];
}

@Component({
  selector: 'app-catalogo-placeholder',
  standalone: true,
  imports: [CommonModule, MaterialModule, RouterLink, DragDropModule, EstatusComponent],
  templateUrl: './catalogo-placeholder.component.html',
  styleUrl: './catalogo-placeholder.component.scss'
})
export class CatalogoPlaceholderComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalogosAdmin = inject(CatalogosAdminService);
  private readonly supabase = inject(SupabaseService);

  private readonly configuraciones: Record<CatalogoAdminKey, CatalogoVistaConfig> = {
    actividades: {
      columnas: [
        { key: 'id', label: 'ID' },
        { key: 'descripcion', label: 'Descripcion' },
        { key: 'clave', label: 'Clave' },
        { key: 'activo', label: 'Activo' }
      ],
      tieneOrden: false,
      editableKeys: ['descripcion', 'clave', 'activo'],
      booleanKeys: ['activo']
    },
    conceptos: {
      columnas: [
        { key: 'id', label: 'ID' },
        { key: 'descripcion', label: 'Descripcion' },
        { key: 'icono', label: 'Icono' }
      ],
      tieneOrden: false,
      editableKeys: ['descripcion', 'icono']
    },
    continentes: {
      columnas: [
        { key: 'id', label: 'ID' },
        { key: 'nombre', label: 'Nombre' }
      ],
      tieneOrden: false,
      editableKeys: ['nombre']
    },
    descuentos: {
      columnas: [
        { key: 'id', label: 'ID' },
        { key: 'tipo_descuento', label: 'Tipo descuento' },
        { key: 'icono', label: 'Icono' }
      ],
      tieneOrden: false,
      editableKeys: ['tipo_descuento', 'icono']
    },
    estatus_empleado: {
      columnas: [
        { key: 'id', label: 'ID' },
        { key: 'clave', label: 'Clave' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'activo', label: 'Activo' },
        { key: 'orden', label: 'Orden' }
      ],
      tieneOrden: true,
      editableKeys: ['clave', 'nombre', 'activo'],
      booleanKeys: ['activo']
    },
    estatus_cotizacion: {
      columnas: [
        { key: 'id', label: 'ID' },
        { key: 'clave', label: 'Clave' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'activo', label: 'Activo' },
        { key: 'orden', label: 'Orden' }
      ],
      tieneOrden: true,
      editableKeys: ['clave', 'nombre', 'activo'],
      booleanKeys: ['activo']
    },
    idiomas: {
      columnas: [
        { key: 'id', label: 'ID' },
        { key: 'codigo', label: 'Codigo' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'activo', label: 'Estatus' },
        { key: 'orden', label: 'Orden' }
      ],
      tieneOrden: true,
      editableKeys: ['codigo', 'nombre', 'activo'],
      booleanKeys: ['activo']
    },
    politicas: {
      columnas: [
        { key: 'id', label: 'ID' },
        { key: 'codigo', label: 'Codigo' },
        { key: 'titulo_es', label: 'Titulo ES' },
        { key: 'activo', label: 'Activo' }
      ],
      tieneOrden: false,
      editableKeys: ['codigo', 'categoria', 'activo'],
      booleanKeys: ['activo']
    },
    regimen_hotel: {
      columnas: [
        { key: 'id', label: 'ID' },
        { key: 'descripcion', label: 'Descripcion' }
      ],
      tieneOrden: false,
      editableKeys: ['descripcion']
    },
    tarifas: {
      columnas: [
        { key: 'id', label: 'ID' },
        { key: 'clave', label: 'Clave' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'activo', label: 'Activo' }
      ],
      tieneOrden: false,
      editableKeys: ['clave', 'nombre', 'activo'],
      booleanKeys: ['activo']
    },
    tipo_imagen: {
      columnas: [
        { key: 'id', label: 'ID' },
        { key: 'clave', label: 'Clave' },
        { key: 'orden', label: 'Orden' }
      ],
      tieneOrden: true,
      editableKeys: ['clave']
    },
    tipos_habitacion: {
      columnas: [
        { key: 'id', label: 'ID' },
        { key: 'nombre_habitacion', label: 'Nombre habitacion' },
        { key: 'descripcion', label: 'Descripcion' }
      ],
      tieneOrden: false,
      editableKeys: ['nombre_habitacion', 'descripcion']
    },
    atracciones: {
      columnas: [
        { key: 'id', label: 'ID' },
        { key: 'clave', label: 'Clave' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'descripcion', label: 'Descripcion' },
        { key: 'icono', label: 'Icono' },
        { key: 'total_registros', label: 'Registros' },
        { key: 'activo', label: 'Activo' },
        { key: 'orden', label: 'Orden' },
        { key: 'created_at', label: 'Creado' }
      ],
      tieneOrden: true,
      editableKeys: ['clave', 'nombre', 'descripcion', 'icono', 'activo'],
      booleanKeys: ['activo']
    }
  };

  titulo = this.route.snapshot.data['titulo'] ?? 'Catalogo';
  descripcion = this.route.snapshot.data['descripcion'] ?? 'Pantalla base del catalogo.';
  catalogoKey = (this.route.snapshot.data['catalogoKey'] ?? 'actividades') as CatalogoAdminKey;

  columnas: CatalogoColumna[] = [];
  displayedColumns: string[] = [];
  items: any[] = [];
  loading = false;
  error = '';
  guardandoOrden = false;
  hayCambiosOrden = false;
  guardandoEdicion = false;
  guardandoCreacion = false;
  eliminandoRegistro = false;
  editingId: number | null = null;
  editingDraft: Record<string, any> = {};
  errorModalEdicion = '';
  errorModalCreacion = '';
  errorModalEliminar = '';
  mostrarModalExito = false;
  mensajeModalExito = '';
  modalEdicionAbierto = false;
  modalCrearAbierto = false;
  modalEliminarAbierto = false;
  itemAEliminar: { id: number; nombre: string; codigo: string } | null = null;
  nuevoRegistroDraft: Record<string, any> = {};
  traduccionesPoliticaPreview: Record<string, IPoliticaTraduccionPreview> = {};
  traduciendoPolitica = false;
  traduccionesAmenidadPreview: Record<string, { descripcion: string }> = {};
  traduciendoAmenidad = false;
  politicasDisponiblesTarifa: IPoliticaTarifaAdmin[] = [];
  filtroPoliticasTarifa = '';
  politicasTarifaSeleccionadas = new Set<number>();
  pageSize = 20;
  pageIndex = 0;
  private ordenOriginalIds: number[] = [];
  private ultimaLlaveTraduccionPolitica = '';
  private ultimaLlaveTraduccionAmenidad = '';
  readonly idiomasVistaPolitica = [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'Inglés' },
    { code: 'pt', label: 'Portugués' },
    { code: 'de', label: 'Alemán' },
    { code: 'fr', label: 'Francés' }
  ];

  get tieneOrden(): boolean {
    return this.configuraciones[this.catalogoKey]?.tieneOrden ?? false;
  }

  get esCatalogoAtracciones(): boolean {
    return this.catalogoKey === 'atracciones';
  }

  get esCatalogoIdiomas(): boolean {
    return this.catalogoKey === 'idiomas';
  }

  get esCatalogoPoliticas(): boolean {
    return this.catalogoKey === 'politicas';
  }

  get esCatalogoAmenidades(): boolean {
    return this.catalogoKey === 'actividades';
  }

  get esCatalogoTarifas(): boolean {
    return this.catalogoKey === 'tarifas';
  }

  get esCatalogoTiposHabitacion(): boolean {
    return this.catalogoKey === 'tipos_habitacion';
  }

  get puedeCrearRegistro(): boolean {
    return (
      this.catalogoKey === 'actividades' ||
      this.catalogoKey === 'continentes' ||
      this.catalogoKey === 'idiomas' ||
      this.catalogoKey === 'politicas' ||
      this.catalogoKey === 'tarifas' ||
      this.catalogoKey === 'tipos_habitacion'
    );
  }

  get usaModalEdicion(): boolean {
    return (
      this.catalogoKey === 'actividades' ||
      this.catalogoKey === 'continentes' ||
      this.catalogoKey === 'idiomas' ||
      this.catalogoKey === 'politicas' ||
      this.catalogoKey === 'tarifas' ||
      this.catalogoKey === 'tipos_habitacion'
    );
  }

  get puedeEliminarRegistro(): boolean {
    return (
      this.catalogoKey === 'actividades' ||
      this.catalogoKey === 'continentes' ||
      this.catalogoKey === 'idiomas' ||
      this.catalogoKey === 'politicas' ||
      this.catalogoKey === 'tarifas' ||
      this.catalogoKey === 'tipos_habitacion'
    );
  }

  get pagedItems(): any[] {
    const start = this.pageIndex * this.pageSize;
    return this.items.slice(start, start + this.pageSize);
  }

  get tieneTraduccionesPoliticaPreview(): boolean {
    return Object.keys(this.traduccionesPoliticaPreview ?? {}).length > 0;
  }

  get tieneTraduccionesAmenidadPreview(): boolean {
    return Object.keys(this.traduccionesAmenidadPreview ?? {}).length > 0;
  }

  get politicasTarifaFiltradas(): IPoliticaTarifaAdmin[] {
    const filtro = this.filtroPoliticasTarifa.trim().toLowerCase();
    if (!filtro) {
      return this.politicasDisponiblesTarifa;
    }

    return this.politicasDisponiblesTarifa.filter((politica) =>
      politica.titulo.toLowerCase().includes(filtro) ||
      politica.codigo.toLowerCase().includes(filtro) ||
      politica.descripcion.toLowerCase().includes(filtro)
    );
  }

  get totalPoliticasTarifaSeleccionadas(): number {
    return this.politicasTarifaSeleccionadas.size;
  }

  get politicasTarifaEditando(): any[] {
    if (!this.esCatalogoTarifas || this.editingId === null) {
      return [];
    }

    const tarifa = this.items.find((item) => Number(item.id) === this.editingId);
    return Array.isArray(tarifa?.politicas) ? tarifa.politicas : [];
  }

  get tituloModalCrear(): string {
    if (this.esCatalogoIdiomas) {
      return 'Nuevo idioma';
    }

    if (this.esCatalogoAmenidades) {
      return 'Nueva amenidad';
    }

    if (this.esCatalogoPoliticas) {
      return 'Nueva politica';
    }

    if (this.esCatalogoTarifas) {
      return 'Nueva tarifa';
    }

    if (this.esCatalogoTiposHabitacion) {
      return 'Nueva habitacion';
    }

    return 'Nuevo continente';
  }

  get descripcionModalCrear(): string {
    if (this.esCatalogoIdiomas) {
      return 'Captura codigo y nombre para crear el nuevo idioma.';
    }

    if (this.esCatalogoAmenidades) {
      return 'Captura descripcion, clave y estatus para crear la nueva amenidad.';
    }

    if (this.esCatalogoPoliticas) {
      return 'Captura codigo, categoria y el texto en espanol para crear la nueva politica.';
    }

    if (this.esCatalogoTarifas) {
      return 'Captura clave, nombre y estatus para crear la nueva tarifa.';
    }

    if (this.esCatalogoTiposHabitacion) {
      return 'Captura el nombre de la habitacion y su descripcion.';
    }

    return 'Captura el nombre para crear el nuevo continente.';
  }

  get tituloModalEdicion(): string {
    if (this.esCatalogoIdiomas) {
      return 'Editar idioma';
    }

    if (this.esCatalogoAmenidades) {
      return 'Editar amenidad';
    }

    if (this.esCatalogoPoliticas) {
      return 'Editar politica';
    }

    if (this.esCatalogoTarifas) {
      return 'Editar tarifa';
    }

    if (this.esCatalogoTiposHabitacion) {
      return 'Editar habitacion';
    }

    return 'Editar continente';
  }

  get descripcionModalEdicion(): string {
    if (this.esCatalogoIdiomas) {
      return 'Actualiza codigo, nombre y estatus del idioma.';
    }

    if (this.esCatalogoAmenidades) {
      return 'Actualiza descripcion, clave y estatus de la amenidad.';
    }

    if (this.esCatalogoPoliticas) {
      return 'Actualiza codigo, categoria y el texto en espanol.';
    }

    if (this.esCatalogoTarifas) {
      return 'Actualiza clave, nombre, estatus y revisa las politicas asignadas.';
    }

    if (this.esCatalogoTiposHabitacion) {
      return 'Actualiza el nombre de la habitacion y su descripcion.';
    }

    return 'Actualiza el nombre del continente y guarda cambios.';
  }

  get textoBotonCrear(): string {
    if (this.esCatalogoIdiomas) {
      return 'Nuevo idioma';
    }

    if (this.esCatalogoAmenidades) {
      return 'Nueva amenidad';
    }

    if (this.esCatalogoPoliticas) {
      return 'Crear nueva politica';
    }

    if (this.esCatalogoTarifas) {
      return 'Nueva tarifa';
    }

    if (this.esCatalogoTiposHabitacion) {
      return 'Nueva habitacion';
    }

    return 'Nuevo continente';
  }

  get textoBotonConfirmarCrear(): string {
    if (this.esCatalogoIdiomas) {
      return 'Crear idioma';
    }

    if (this.esCatalogoAmenidades) {
      return 'Crear amenidad';
    }

    if (this.esCatalogoPoliticas) {
      return 'Crear politica';
    }

    if (this.esCatalogoTarifas) {
      return 'Crear tarifa';
    }

    if (this.esCatalogoTiposHabitacion) {
      return 'Crear habitacion';
    }

    return 'Crear continente';
  }

  get mensajeExitoEdicion(): string {
    if (this.esCatalogoIdiomas) {
      return 'Idioma guardado correctamente.';
    }

    if (this.esCatalogoAmenidades) {
      return 'Amenidad guardada correctamente.';
    }

    if (this.esCatalogoPoliticas) {
      return 'Politica guardada correctamente.';
    }

    if (this.esCatalogoTarifas) {
      return 'Tarifa guardada correctamente.';
    }

    if (this.esCatalogoTiposHabitacion) {
      return 'Habitacion guardada correctamente.';
    }

    return 'Registro guardado correctamente.';
  }

  get mensajeExitoCreacion(): string {
    if (this.esCatalogoIdiomas) {
      return 'Idioma creado correctamente.';
    }

    if (this.esCatalogoAmenidades) {
      return 'Amenidad creada correctamente.';
    }

    if (this.esCatalogoPoliticas) {
      return 'Politica creada correctamente.';
    }

    if (this.esCatalogoTarifas) {
      return 'Tarifa creada correctamente.';
    }

    if (this.esCatalogoTiposHabitacion) {
      return 'Habitacion creada correctamente.';
    }

    return 'Registro creado correctamente.';
  }

  get mensajeExitoEliminacion(): string {
    if (this.esCatalogoIdiomas) {
      return 'Idioma eliminado correctamente.';
    }

    if (this.esCatalogoAmenidades) {
      return 'Amenidad eliminada correctamente.';
    }

    if (this.esCatalogoPoliticas) {
      return 'Politica eliminada correctamente.';
    }

    if (this.esCatalogoTarifas) {
      return 'Tarifa eliminada correctamente.';
    }

    if (this.esCatalogoTiposHabitacion) {
      return 'Habitacion eliminada correctamente.';
    }

    return 'Registro eliminado correctamente.';
  }

  async ngOnInit() {
    const configuracion = this.configuraciones[this.catalogoKey];
    this.columnas = configuracion?.columnas ?? [];
    this.displayedColumns = this.tieneOrden
      ? [...this.columnas.map((x) => x.key), 'acciones']
      : [...this.columnas.map((x) => x.key), 'acciones'];
    await this.cargar();
  }

  async cargar() {
    this.loading = true;
    this.error = '';

    try {
      const [info, politicasTarifa] = await Promise.all([
        this.catalogosAdmin.obtenerCatalogoAdmin(this.catalogoKey),
        this.esCatalogoTarifas ? this.catalogosAdmin.obtenerPoliticasDisponiblesTarifa() : Promise.resolve([])
      ]);
      this.items = [...(info ?? [])];
      this.politicasDisponiblesTarifa = [...(politicasTarifa ?? [])];
      this.ordenOriginalIds = this.items.map((item) => Number(item.id));
      this.pageIndex = 0;
      this.actualizarEstadoOrden();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo cargar el catalogo.';
    } finally {
      this.loading = false;
    }
  }

  drop(event: CdkDragDrop<any[]>) {
    if (!this.tieneOrden) {
      return;
    }

    const pageStart = this.pageIndex * this.pageSize;
    moveItemInArray(
      this.items,
      pageStart + event.previousIndex,
      pageStart + event.currentIndex
    );
    this.items = [...this.items];
    this.actualizarEstadoOrden();
    this.error = '';
  }

  async actualizarOrden() {
    if (!this.tieneOrden || !this.hayCambiosOrden || this.guardandoOrden) {
      return;
    }

    this.guardandoOrden = true;
    this.error = '';
    try {
      const payload = this.items.map((item, index) => ({
        id: Number(item.id),
        orden: index + 1
      }));
      await this.catalogosAdmin.actualizarOrdenCatalogoAdmin(this.catalogoKey, payload);
      this.ordenOriginalIds = this.items.map((item) => Number(item.id));
      this.actualizarEstadoOrden();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo actualizar el orden.';
    } finally {
      this.guardandoOrden = false;
    }
  }

  iniciarEdicion(item: any) {
    if (this.esCatalogoAtracciones) {
      this.irEditarAtracciones(item);
      return;
    }

    this.error = '';
    this.errorModalEdicion = '';
    this.editingId = Number(item.id);
    const editableKeys = this.getEditableKeys();
    this.editingDraft = editableKeys.reduce((acc, key) => {
      acc[key] = item?.[key] ?? null;
      return acc;
    }, {} as Record<string, any>);

    if (this.esCatalogoPoliticas) {
      this.editingDraft = {
        ...this.editingDraft,
        titulo_es: item?.titulo_es ?? '',
        descripcion_es: item?.descripcion_es ?? ''
      };
      this.traduccionesPoliticaPreview = this.normalizarTraduccionesPolitica(
        item?.traducciones_preview,
        item?.titulo_es,
        item?.descripcion_es
      );
      this.ultimaLlaveTraduccionPolitica = this.obtenerLlaveTraduccionPolitica(
        item?.titulo_es,
        item?.descripcion_es
      );
    } else if (this.esCatalogoTarifas) {
      this.filtroPoliticasTarifa = '';
      this.politicasTarifaSeleccionadas = new Set(
        (item?.politicas ?? [])
          .map((politica: any) => Number(politica?.id))
          .filter((id: number) => Number.isFinite(id))
      );
    } else if (this.esCatalogoAmenidades) {
      this.editingDraft = {
        ...this.editingDraft,
        descripcion: item?.descripcion ?? '',
        clave: item?.clave ?? '',
        activo: Boolean(item?.activo)
      };
      this.traduccionesAmenidadPreview = item?.traducciones_preview ?? {};
      this.ultimaLlaveTraduccionAmenidad = this.limpiarTexto(item?.descripcion);
    }

    if (this.usaModalEdicion) {
      this.modalEdicionAbierto = true;
    }
  }

  cancelarEdicion() {
    this.editingId = null;
    this.editingDraft = {};
    this.guardandoEdicion = false;
  }

  cerrarModalEdicion() {
    this.errorModalEdicion = '';
    this.modalEdicionAbierto = false;
    this.cancelarEdicion();
    this.limpiarVistaPreviaPolitica();
    this.limpiarVistaPreviaAmenidad();
    this.filtroPoliticasTarifa = '';
    this.politicasTarifaSeleccionadas.clear();
  }

  private limpiarVistaPreviaAmenidad() {
    this.traduccionesAmenidadPreview = {};
    this.ultimaLlaveTraduccionAmenidad = '';
  }

  async traducirAmenidadAlSalirDelCampo(event?: Event) {
    if (!this.esCatalogoAmenidades) {
      return;
    }

    if (event instanceof KeyboardEvent && event.key === 'Enter') {
      event.preventDefault();
    }

    await this.actualizarVistaPreviaAmenidad();
  }

  private async actualizarVistaPreviaAmenidad() {
    if (!this.esCatalogoAmenidades || this.traduciendoAmenidad || this.guardandoEdicion || this.guardandoCreacion) {
      return;
    }

    const fuente = this.modalEdicionAbierto ? this.editingDraft : this.modalCrearAbierto ? this.nuevoRegistroDraft : null;
    if (!fuente) {
      return;
    }

    const descripcion = this.limpiarTexto(String(fuente['descripcion'] ?? ''));

    if (!descripcion) {
      this.limpiarVistaPreviaAmenidad();
      return;
    }

    if (descripcion === this.ultimaLlaveTraduccionAmenidad && this.tieneTraduccionesAmenidadPreview) {
      return;
    }

    this.traduciendoAmenidad = true;

    try {
      const traducciones = await this.supabase.traducirDesdeEspanol({
        title: '',
        description: descripcion
      });

      const concentrado = this.idiomasVistaPolitica.reduce((acc, idioma) => {
        const traduccionIdioma = traducciones?.[idioma.code];
        if (!traduccionIdioma) {
          return acc;
        }

        acc[idioma.code] = {
          descripcion: typeof traduccionIdioma.description === 'string' ? traduccionIdioma.description : ''
        };

        return acc;
      }, {} as Record<string, { descripcion: string }>);

      concentrado['es'] = { descripcion };

      this.traduccionesAmenidadPreview = concentrado;
      this.ultimaLlaveTraduccionAmenidad = descripcion;
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo traducir la amenidad.';
    } finally {
      this.traduciendoAmenidad = false;
    }
  }

  async guardarEdicionDesdeModal() {
    if (!this.usaModalEdicion || this.editingId === null) {
      return;
    }

    this.guardandoEdicion = true;
    this.error = '';
    this.errorModalEdicion = '';

    try {
      if (this.esCatalogoIdiomas) {
        const codigo = String(this.editingDraft['codigo'] ?? '').trim().toLowerCase();
        const nombre = String(this.editingDraft['nombre'] ?? '').trim();

        if (!codigo || !nombre) {
          this.errorModalEdicion = 'Codigo y nombre son obligatorios para editar un idioma.';
          this.guardandoEdicion = false;
          return;
        }

        const payload = {
          codigo,
          nombre,
          activo: Boolean(this.editingDraft['activo'])
        };

        await this.catalogosAdmin.actualizarCatalogoAdmin('idiomas', this.editingId, payload);
        this.items = this.items.map((current) =>
          Number(current.id) === this.editingId
            ? { ...current, ...payload }
            : current
        );
      } else if (this.esCatalogoAmenidades) {
        const descripcion = String(this.editingDraft['descripcion'] ?? '').trim();
        const clave = String(this.editingDraft['clave'] ?? '').trim();

        if (!descripcion || !clave) {
          this.errorModalEdicion = 'Descripcion y clave son obligatorias para editar una amenidad.';
          this.guardandoEdicion = false;
          return;
        }

        const payload = {
          descripcion,
          clave,
          activo: Boolean(this.editingDraft['activo'])
        };

        await this.catalogosAdmin.actualizarCatalogoAdmin('actividades', this.editingId, payload);
        this.items = this.items.map((current) =>
          Number(current.id) === this.editingId
            ? { ...current, ...payload }
            : current
        );
      } else if (this.esCatalogoPoliticas) {
        const codigo = String(this.editingDraft['codigo'] ?? '').trim();
        const categoria = String(this.editingDraft['categoria'] ?? '').trim();
        const tituloEs = String(this.editingDraft['titulo_es'] ?? '').trim();
        const descripcionEs = String(this.editingDraft['descripcion_es'] ?? '').trim();

        if (!codigo || !categoria || !tituloEs || !descripcionEs) {
          this.errorModalEdicion = 'Codigo, categoria, titulo y descripcion en espanol son obligatorios para editar una politica.';
          this.guardandoEdicion = false;
          return;
        }

        const payload = {
          codigo,
          categoria,
          activo: Boolean(this.editingDraft['activo']),
          titulo_es: tituloEs,
          descripcion_es: descripcionEs
        };

        await this.catalogosAdmin.actualizarCatalogoAdmin('politicas', this.editingId, payload);
        this.items = this.items.map((current) =>
          Number(current.id) === this.editingId
            ? {
              ...current,
              codigo,
              categoria,
              activo: Boolean(this.editingDraft['activo']),
              titulo_es: tituloEs,
              descripcion_es: descripcionEs,
              traducciones_preview: this.traduccionesPoliticaPreview
            }
            : current
        );
      } else if (this.esCatalogoTarifas) {
        const clave = String(this.editingDraft['clave'] ?? '').trim();
        const nombre = String(this.editingDraft['nombre'] ?? '').trim();

        if (!clave || !nombre) {
          this.errorModalEdicion = 'Clave y nombre son obligatorios para editar una tarifa.';
          this.guardandoEdicion = false;
          return;
        }

        const payload = {
          clave,
          nombre,
          activo: Boolean(this.editingDraft['activo']),
          politica_ids: Array.from(this.politicasTarifaSeleccionadas.values())
        };

        await this.catalogosAdmin.actualizarCatalogoAdmin('tarifas', this.editingId, payload);
        this.items = this.items.map((current) =>
          Number(current.id) === this.editingId
            ? {
              ...current,
              clave,
              nombre,
              activo: Boolean(this.editingDraft['activo']),
              politicas: this.politicasDisponiblesTarifa
                .filter((politica) => this.politicasTarifaSeleccionadas.has(Number(politica.id)))
                .map((politica, index) => ({
                  id: politica.id,
                  orden: index + 1,
                  codigo: politica.codigo,
                  activo: politica.activo,
                  titulo: politica.titulo,
                  descripcion: politica.descripcion
                }))
            }
            : current
        );
      } else if (this.esCatalogoTiposHabitacion) {
        const nombreHabitacion = String(this.editingDraft['nombre_habitacion'] ?? '').trim();
        const descripcion = String(this.editingDraft['descripcion'] ?? '').trim();

        if (!nombreHabitacion) {
          this.errorModalEdicion = 'El nombre de la habitacion es obligatorio para editar.';
          this.guardandoEdicion = false;
          return;
        }

        const payload = {
          nombre_habitacion: nombreHabitacion,
          descripcion
        };

        await this.catalogosAdmin.actualizarCatalogoAdmin('tipos_habitacion', this.editingId, payload);
        this.items = this.items.map((current) =>
          Number(current.id) === this.editingId
            ? { ...current, ...payload }
            : current
        );
      } else {
        const nombre = String(this.editingDraft['nombre'] ?? '').trim();
        if (!nombre) {
          this.errorModalEdicion = 'El nombre del continente es obligatorio.';
          this.guardandoEdicion = false;
          return;
        }

        await this.catalogosAdmin.actualizarCatalogoAdmin('continentes', this.editingId, { nombre });
        this.items = this.items.map((current) =>
          Number(current.id) === this.editingId
            ? { ...current, nombre }
            : current
        );
      }

      this.cerrarModalEdicion();
      this.mostrarModalExitoConMensaje(this.mensajeExitoEdicion);
    } catch (error: any) {
      this.errorModalEdicion = error?.message ?? 'No se pudo guardar la edicion.';
      this.guardandoEdicion = false;
    }
  }

  abrirModalCrear() {
    if (!this.puedeCrearRegistro) {
      return;
    }

    this.error = '';
    this.errorModalCreacion = '';
    this.nuevoRegistroDraft = this.getEditableKeys().reduce((acc, key) => {
      acc[key] = null;
      return acc;
    }, {} as Record<string, any>);

    if (this.esCatalogoIdiomas) {
      this.nuevoRegistroDraft = {
        ...this.nuevoRegistroDraft,
        codigo: '',
        nombre: '',
        activo: true
      };
    } else if (this.esCatalogoAmenidades) {
      this.nuevoRegistroDraft = {
        ...this.nuevoRegistroDraft,
        descripcion: '',
        clave: '',
        activo: true
      };
    } else if (this.esCatalogoPoliticas) {
      this.nuevoRegistroDraft = {
        ...this.nuevoRegistroDraft,
        codigo: '',
        categoria: '',
        titulo_es: '',
        descripcion_es: '',
        activo: true
      };
      this.traduccionesPoliticaPreview = {};
      this.ultimaLlaveTraduccionPolitica = '';
    } else if (this.esCatalogoTarifas) {
      this.nuevoRegistroDraft = {
        ...this.nuevoRegistroDraft,
        clave: '',
        nombre: '',
        activo: true
      };
      this.filtroPoliticasTarifa = '';
      this.politicasTarifaSeleccionadas.clear();
    } else if (this.esCatalogoTiposHabitacion) {
      this.nuevoRegistroDraft = {
        ...this.nuevoRegistroDraft,
        nombre_habitacion: '',
        descripcion: ''
      };
    }

    this.modalCrearAbierto = true;
  }

  cerrarModalCrear() {
    this.modalCrearAbierto = false;
    this.nuevoRegistroDraft = {};
    this.guardandoCreacion = false;
    this.errorModalCreacion = '';
    this.limpiarVistaPreviaPolitica();
    this.filtroPoliticasTarifa = '';
    this.politicasTarifaSeleccionadas.clear();
  }

  abrirModalEliminar(item: any) {
    if (!this.puedeEliminarRegistro) {
      return;
    }

    this.error = '';
    this.errorModalEliminar = '';
    const codigo = String(
      item?.codigo ??
      item?.clave ??
      item?.descripcion ??
      item?.nombre_habitacion ??
      item?.nombre ??
      `ID ${item?.id ?? ''}`
    );
    this.itemAEliminar = {
      id: Number(item.id),
      nombre: codigo,
      codigo
    };
    this.modalEliminarAbierto = true;
  }

  cerrarModalEliminar() {
    this.modalEliminarAbierto = false;
    this.itemAEliminar = null;
    this.errorModalEliminar = '';
    this.eliminandoRegistro = false;
  }

  async confirmarEliminarRegistro() {
    if (!this.puedeEliminarRegistro || !this.itemAEliminar || this.eliminandoRegistro) {
      return;
    }

    this.eliminandoRegistro = true;
    this.error = '';
    this.errorModalEliminar = '';

    try {
      await this.catalogosAdmin.eliminarCatalogoAdmin(this.catalogoKey, this.itemAEliminar.id);
      this.items = this.items.filter((item) => Number(item.id) !== this.itemAEliminar?.id);

      const totalPaginas = Math.ceil(this.items.length / this.pageSize);
      if (this.pageIndex >= totalPaginas && this.pageIndex > 0) {
        this.pageIndex = Math.max(totalPaginas - 1, 0);
      }

      this.cerrarModalEliminar();
      this.mostrarModalExitoConMensaje(this.mensajeExitoEliminacion);
    } catch (error: any) {
      this.errorModalEliminar = error?.message ?? 'No se pudo eliminar el registro.';
      this.eliminandoRegistro = false;
    }
  }

  actualizarTextoCreacion(key: string, value: string) {
    this.nuevoRegistroDraft = { ...this.nuevoRegistroDraft, [key]: value };
  }

  actualizarBooleanCreacion(key: string, value: boolean) {
    this.nuevoRegistroDraft = { ...this.nuevoRegistroDraft, [key]: value };
  }

  async crearRegistro() {
    if (!this.puedeCrearRegistro || this.guardandoCreacion) {
      return;
    }

    this.guardandoCreacion = true;
    this.error = '';
    this.errorModalCreacion = '';

    try {
      if (this.esCatalogoIdiomas) {
        const codigo = String(this.nuevoRegistroDraft['codigo'] ?? '').trim().toLowerCase();
        const nombre = String(this.nuevoRegistroDraft['nombre'] ?? '').trim();

        if (!codigo || !nombre) {
          this.errorModalCreacion = 'Codigo y nombre son obligatorios para crear un idioma.';
          this.guardandoCreacion = false;
          return;
        }

        await this.catalogosAdmin.crearCatalogoAdmin(this.catalogoKey, {
          codigo,
          nombre,
          activo: Boolean(this.nuevoRegistroDraft['activo'])
        });
      } else if (this.esCatalogoPoliticas) {
        const codigo = String(this.nuevoRegistroDraft['codigo'] ?? '').trim();
        const categoria = String(this.nuevoRegistroDraft['categoria'] ?? '').trim();
        const tituloEs = String(this.nuevoRegistroDraft['titulo_es'] ?? '').trim();
        const descripcionEs = String(this.nuevoRegistroDraft['descripcion_es'] ?? '').trim();

        if (!codigo || !categoria || !tituloEs || !descripcionEs) {
          this.errorModalCreacion = 'Codigo, categoria, titulo y descripcion en espanol son obligatorios para crear una politica.';
          this.guardandoCreacion = false;
          return;
        }

        await this.catalogosAdmin.crearCatalogoAdmin(this.catalogoKey, {
          codigo,
          categoria,
          activo: Boolean(this.nuevoRegistroDraft['activo']),
          titulo_es: tituloEs,
          descripcion_es: descripcionEs
        });
      } else if (this.esCatalogoAmenidades) {
        const descripcion = String(this.nuevoRegistroDraft['descripcion'] ?? '').trim();
        const clave = String(this.nuevoRegistroDraft['clave'] ?? '').trim();

        if (!descripcion || !clave) {
          this.errorModalCreacion = 'Descripcion y clave son obligatorias para crear una amenidad.';
          this.guardandoCreacion = false;
          return;
        }

        await this.catalogosAdmin.crearCatalogoAdmin(this.catalogoKey, {
          descripcion,
          clave,
          activo: Boolean(this.nuevoRegistroDraft['activo'])
        });
      } else if (this.esCatalogoTarifas) {
        const clave = String(this.nuevoRegistroDraft['clave'] ?? '').trim();
        const nombre = String(this.nuevoRegistroDraft['nombre'] ?? '').trim();

        if (!clave || !nombre) {
          this.errorModalCreacion = 'Clave y nombre son obligatorios para crear una tarifa.';
          this.guardandoCreacion = false;
          return;
        }

        await this.catalogosAdmin.crearCatalogoAdmin(this.catalogoKey, {
          clave,
          nombre,
          activo: Boolean(this.nuevoRegistroDraft['activo']),
          politica_ids: Array.from(this.politicasTarifaSeleccionadas.values())
        });
      } else if (this.esCatalogoTiposHabitacion) {
        const nombreHabitacion = String(this.nuevoRegistroDraft['nombre_habitacion'] ?? '').trim();
        const descripcion = String(this.nuevoRegistroDraft['descripcion'] ?? '').trim();

        if (!nombreHabitacion) {
          this.errorModalCreacion = 'El nombre de la habitacion es obligatorio.';
          this.guardandoCreacion = false;
          return;
        }

        await this.catalogosAdmin.crearCatalogoAdmin(this.catalogoKey, {
          nombre_habitacion: nombreHabitacion,
          descripcion
        });
      } else {
        const nombre = String(this.nuevoRegistroDraft['nombre'] ?? '').trim();
        if (!nombre) {
          this.errorModalCreacion = 'El nombre del continente es obligatorio.';
          this.guardandoCreacion = false;
          return;
        }

        await this.catalogosAdmin.crearCatalogoAdmin(this.catalogoKey, { nombre });
      }

      this.cerrarModalCrear();
      await this.cargar();
      this.mostrarModalExitoConMensaje(this.mensajeExitoCreacion);
    } catch (error: any) {
      this.errorModalCreacion = error?.message ?? 'No se pudo crear el registro.';
      this.guardandoCreacion = false;
    }
  }

  async guardarEdicion(item: any) {
    if (this.esCatalogoAtracciones) {
      return;
    }

    if (this.editingId !== Number(item.id) || this.guardandoEdicion) {
      return;
    }

    this.guardandoEdicion = true;
    this.error = '';
    try {
      const editableKeys = this.getEditableKeys();
      const payload = editableKeys.reduce((acc, key) => {
        acc[key] = this.isBooleanColumn(key)
          ? Boolean(this.editingDraft[key])
          : this.editingDraft[key];
        return acc;
      }, {} as Record<string, any>);

      await this.catalogosAdmin.actualizarCatalogoAdmin(this.catalogoKey, Number(item.id), payload);

      this.items = this.items.map((current) =>
        Number(current.id) === Number(item.id)
          ? { ...current, ...payload }
          : current
      );
      this.cancelarEdicion();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo guardar la edicion.';
      this.guardandoEdicion = false;
    }
  }

  isEditableColumn(key: string): boolean {
    if (this.esCatalogoAtracciones) {
      return false;
    }
    return this.getEditableKeys().includes(key);
  }

  isBooleanColumn(key: string): boolean {
    const boolKeys = this.configuraciones[this.catalogoKey]?.booleanKeys ?? [];
    return boolKeys.includes(key);
  }

  actualizarTextoDraft(key: string, value: string) {
    this.editingDraft = { ...this.editingDraft, [key]: value };
  }

  actualizarBooleanDraft(key: string, value: boolean) {
    this.editingDraft = { ...this.editingDraft, [key]: value };
  }

  esPoliticaTarifaSeleccionada(politicaId: number): boolean {
    return this.politicasTarifaSeleccionadas.has(Number(politicaId));
  }

  togglePoliticaTarifa(politicaId: number, checked: boolean) {
    const id = Number(politicaId);
    if (!Number.isFinite(id)) {
      return;
    }

    if (checked) {
      this.politicasTarifaSeleccionadas.add(id);
      return;
    }

    this.politicasTarifaSeleccionadas.delete(id);
  }

  async traducirPoliticaAlSalirDelCampo(event?: Event) {
    if (!this.esCatalogoPoliticas) {
      return;
    }

    if (event instanceof KeyboardEvent && event.key === 'Enter') {
      event.preventDefault();
    }

    if (this.traduciendoPolitica || this.guardandoEdicion || this.guardandoCreacion) {
      return;
    }

    await this.actualizarVistaPreviaPolitica();
  }

  getNombreIdiomaPolitica(codigo: string): string {
    const nombres: Record<string, string> = {
      es: 'Español',
      en: 'Ingles',
      pt: 'Portugues',
      de: 'Aleman',
      fr: 'Frances'
    };

    return nombres[String(codigo ?? '').toLowerCase()] ?? String(codigo ?? '').toUpperCase();
  }

  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    if (this.editingId !== null) {
      this.cancelarEdicion();
    }
  }

  getGlobalIndex(localIndex: number): number {
    return this.pageIndex * this.pageSize + localIndex;
  }

  getValor(item: any, key: string, index: number): string {
    const valor = item?.[key];

    if (key === 'orden' && this.tieneOrden) {
      return String(index + 1);
    }

    if (typeof valor === 'boolean') {
      return valor ? 'Si' : 'No';
    }

    if (key === 'created_at' && valor) {
      const date = new Date(valor);
      if (Number.isNaN(date.getTime())) {
        return String(valor);
      }
      return date.toLocaleString();
    }

    return valor === null || valor === undefined || valor === '' ? '-' : String(valor);
  }

  private actualizarEstadoOrden() {
    if (!this.tieneOrden) {
      this.hayCambiosOrden = false;
      return;
    }

    this.hayCambiosOrden = !this.items.every(
      (item, index) => Number(item.id) === this.ordenOriginalIds[index]
    );
  }

  private getEditableKeys(): string[] {
    return this.configuraciones[this.catalogoKey]?.editableKeys ?? [];
  }

  private limpiarVistaPreviaPolitica() {
    this.traduccionesPoliticaPreview = {};
    this.ultimaLlaveTraduccionPolitica = '';
    this.traduciendoPolitica = false;
  }

  private normalizarTraduccionesPolitica(
    traducciones: Record<string, IPoliticaTraduccionPreview> | null | undefined,
    tituloEs: string | null | undefined,
    descripcionEs: string | null | undefined
  ): Record<string, IPoliticaTraduccionPreview> {
    const concentrado = Object.entries(traducciones ?? {}).reduce((acc, [idioma, valor]) => {
      const codigoIdioma = String(idioma ?? '').toLowerCase();
      if (!codigoIdioma) {
        return acc;
      }

      acc[codigoIdioma] = {
        titulo: String(valor?.titulo ?? '').trim(),
        descripcion: String(valor?.descripcion ?? '').trim()
      };

      return acc;
    }, {} as Record<string, IPoliticaTraduccionPreview>);

    const titulo = this.limpiarTexto(tituloEs);
    const descripcion = this.limpiarTexto(descripcionEs);
    if (titulo || descripcion) {
      concentrado['es'] = {
        titulo,
        descripcion
      };
    }

    return concentrado;
  }

  private obtenerLlaveTraduccionPolitica(
    titulo: string | null | undefined,
    descripcion: string | null | undefined
  ): string {
    return `${this.limpiarTexto(titulo)}|${this.limpiarTexto(descripcion)}`;
  }

  private async actualizarVistaPreviaPolitica() {
    if (!this.esCatalogoPoliticas || this.traduciendoPolitica || this.guardandoEdicion || this.guardandoCreacion) {
      return;
    }

    const fuente = this.modalEdicionAbierto ? this.editingDraft : this.modalCrearAbierto ? this.nuevoRegistroDraft : null;
    if (!fuente) {
      return;
    }

    const titulo = this.limpiarTexto(String(fuente['titulo_es'] ?? ''));
    const descripcion = this.limpiarTexto(String(fuente['descripcion_es'] ?? ''));

    if (!titulo || !descripcion) {
      this.traduccionesPoliticaPreview = {};
      this.ultimaLlaveTraduccionPolitica = '';
      return;
    }

    const llaveActual = this.obtenerLlaveTraduccionPolitica(titulo, descripcion);
    if (llaveActual === this.ultimaLlaveTraduccionPolitica && Object.keys(this.traduccionesPoliticaPreview).length > 0) {
      return;
    }

    this.traduciendoPolitica = true;

    try {
      const traducciones = await this.supabase.traducirPoliticaDesdeEspanol({
        title: titulo,
        description: descripcion
      });

      const concentrado = this.idiomasVistaPolitica.reduce((acc, idioma) => {
        const traduccionIdioma = traducciones?.[idioma.code];
        if (!traduccionIdioma) {
          return acc;
        }

        acc[idioma.code] = {
          titulo: typeof traduccionIdioma.title === 'string' ? traduccionIdioma.title : '',
          descripcion: typeof traduccionIdioma.description === 'string' ? traduccionIdioma.description : ''
        };

        return acc;
      }, {} as Record<string, IPoliticaTraduccionPreview>);

      concentrado['es'] = {
        titulo,
        descripcion
      };

      this.traduccionesPoliticaPreview = concentrado;
      this.ultimaLlaveTraduccionPolitica = llaveActual;
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo traducir la politica.';
    } finally {
      this.traduciendoPolitica = false;
    }
  }

  cerrarModalExito() {
    this.mostrarModalExito = false;
    this.mensajeModalExito = '';
    this.router.navigate([`/admin/catalogos/${this.catalogoKey}`]);
  }

  private mostrarModalExitoConMensaje(message: string) {
    this.mensajeModalExito = message;
    this.mostrarModalExito = true;
  }

  private limpiarTexto(value: string | null | undefined): string {
    return String(value ?? '').trim();
  }

  irEditarAtracciones(item: any) {
    this.router.navigate(['/admin/catalogos/atracciones/editar', Number(item.id)]);
  }
}
