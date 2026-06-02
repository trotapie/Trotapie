import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, inject, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogoAdminKey, CatalogosAdminService } from 'app/core/catalogos-admin.service';
import { EstatusComponent } from 'app/shared/estatus/estatus.component';
import { MaterialModule } from 'app/shared/material.module';

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

  private readonly configuraciones: Record<CatalogoAdminKey, CatalogoVistaConfig> = {
    actividades: {
      columnas: [
        { key: 'id', label: 'ID' },
        { key: 'descripcion', label: 'Descripcion' },
        { key: 'clave', label: 'Clave' },
        { key: 'activo', label: 'Activo' },
        { key: 'orden', label: 'Orden' }
      ],
      tieneOrden: true,
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
        { key: 'categoria', label: 'Categoria' },
        { key: 'activo', label: 'Activo' },
        { key: 'created_at', label: 'Creado' }
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
        { key: 'activo', label: 'Activo' },
        { key: 'created_at', label: 'Creado' }
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
  pageSize = 20;
  pageIndex = 0;
  private ordenOriginalIds: number[] = [];

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

  get puedeCrearRegistro(): boolean {
    return this.catalogoKey === 'continentes' || this.catalogoKey === 'idiomas' || this.catalogoKey === 'politicas';
  }

  get usaModalEdicion(): boolean {
    return this.catalogoKey === 'continentes' || this.catalogoKey === 'idiomas' || this.catalogoKey === 'politicas';
  }

  get puedeEliminarRegistro(): boolean {
    return this.catalogoKey === 'continentes' || this.catalogoKey === 'idiomas' || this.catalogoKey === 'politicas';
  }

  get pagedItems(): any[] {
    const start = this.pageIndex * this.pageSize;
    return this.items.slice(start, start + this.pageSize);
  }

  get tituloModalCrear(): string {
    if (this.esCatalogoIdiomas) {
      return 'Nuevo idioma';
    }

    if (this.esCatalogoPoliticas) {
      return 'Nueva politica';
    }

    return 'Nuevo continente';
  }

  get descripcionModalCrear(): string {
    if (this.esCatalogoIdiomas) {
      return 'Captura codigo y nombre para crear el nuevo idioma.';
    }

    if (this.esCatalogoPoliticas) {
      return 'Captura codigo, categoria y estatus para crear la nueva politica.';
    }

    return 'Captura el nombre para crear el nuevo continente.';
  }

  get tituloModalEdicion(): string {
    if (this.esCatalogoIdiomas) {
      return 'Editar idioma';
    }

    if (this.esCatalogoPoliticas) {
      return 'Editar politica';
    }

    return 'Editar continente';
  }

  get descripcionModalEdicion(): string {
    if (this.esCatalogoIdiomas) {
      return 'Actualiza codigo, nombre y estatus del idioma.';
    }

    if (this.esCatalogoPoliticas) {
      return 'Actualiza codigo, categoria y estatus de la politica.';
    }

    return 'Actualiza el nombre del continente y guarda cambios.';
  }

  get textoBotonCrear(): string {
    if (this.esCatalogoIdiomas) {
      return 'Nuevo idioma';
    }

    if (this.esCatalogoPoliticas) {
      return 'Crear nueva politica';
    }

    return 'Nuevo continente';
  }

  get textoBotonConfirmarCrear(): string {
    if (this.esCatalogoIdiomas) {
      return 'Crear idioma';
    }

    if (this.esCatalogoPoliticas) {
      return 'Crear politica';
    }

    return 'Crear continente';
  }

  get mensajeExitoEdicion(): string {
    if (this.esCatalogoIdiomas) {
      return 'Idioma guardado correctamente.';
    }

    if (this.esCatalogoPoliticas) {
      return 'Politica guardada correctamente.';
    }

    return 'Registro guardado correctamente.';
  }

  get mensajeExitoCreacion(): string {
    if (this.esCatalogoIdiomas) {
      return 'Idioma creado correctamente.';
    }

    if (this.esCatalogoPoliticas) {
      return 'Politica creada correctamente.';
    }

    return 'Registro creado correctamente.';
  }

  get mensajeExitoEliminacion(): string {
    if (this.esCatalogoIdiomas) {
      return 'Idioma eliminado correctamente.';
    }

    if (this.esCatalogoPoliticas) {
      return 'Politica eliminada correctamente.';
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
      const info = await this.catalogosAdmin.obtenerCatalogoAdmin(this.catalogoKey);
      this.items = [...(info ?? [])];
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
      } else if (this.esCatalogoPoliticas) {
        const codigo = String(this.editingDraft['codigo'] ?? '').trim();
        const categoria = String(this.editingDraft['categoria'] ?? '').trim();

        if (!codigo || !categoria) {
          this.errorModalEdicion = 'Codigo y categoria son obligatorios para editar una politica.';
          this.guardandoEdicion = false;
          return;
        }

        const payload = {
          codigo,
          categoria,
          activo: Boolean(this.editingDraft['activo'])
        };

        await this.catalogosAdmin.actualizarCatalogoAdmin('politicas', this.editingId, payload);
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
    } else if (this.esCatalogoPoliticas) {
      this.nuevoRegistroDraft = {
        ...this.nuevoRegistroDraft,
        codigo: '',
        categoria: '',
        activo: true
      };
    }

    this.modalCrearAbierto = true;
  }

  cerrarModalCrear() {
    this.modalCrearAbierto = false;
    this.nuevoRegistroDraft = {};
    this.guardandoCreacion = false;
    this.errorModalCreacion = '';
  }

  abrirModalEliminar(item: any) {
    if (!this.puedeEliminarRegistro) {
      return;
    }

    this.error = '';
    this.errorModalEliminar = '';
    const codigo = String(item?.codigo ?? item?.clave ?? item?.nombre ?? `ID ${item?.id ?? ''}`);
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

        if (!codigo || !categoria) {
          this.errorModalCreacion = 'Codigo y categoria son obligatorios para crear una politica.';
          this.guardandoCreacion = false;
          return;
        }

        await this.catalogosAdmin.crearCatalogoAdmin(this.catalogoKey, {
          codigo,
          categoria,
          activo: Boolean(this.nuevoRegistroDraft['activo'])
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

  cerrarModalExito() {
    this.mostrarModalExito = false;
    this.mensajeModalExito = '';
    this.router.navigate(['/admin/catalogos/politicas']);
  }

  private mostrarModalExitoConMensaje(message: string) {
    this.mensajeModalExito = message;
    this.mostrarModalExito = true;
  }

  irEditarAtracciones(item: any) {
    this.router.navigate(['/admin/catalogos/atracciones/editar', Number(item.id)]);
  }
}
