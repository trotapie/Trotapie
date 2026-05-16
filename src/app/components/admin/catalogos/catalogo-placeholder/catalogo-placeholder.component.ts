import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, inject, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogoAdminKey, SupabaseService } from 'app/core/supabase.service';
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
  imports: [CommonModule, MaterialModule, RouterLink, DragDropModule],
  templateUrl: './catalogo-placeholder.component.html',
  styleUrl: './catalogo-placeholder.component.scss'
})
export class CatalogoPlaceholderComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);

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
    idiomas: {
      columnas: [
        { key: 'id', label: 'ID' },
        { key: 'codigo', label: 'Codigo' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'activo', label: 'Activo' },
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
  editingId: number | null = null;
  editingDraft: Record<string, any> = {};
  pageSize = 20;
  pageIndex = 0;
  private ordenOriginalIds: number[] = [];

  get tieneOrden(): boolean {
    return this.configuraciones[this.catalogoKey]?.tieneOrden ?? false;
  }

  get esCatalogoAtracciones(): boolean {
    return this.catalogoKey === 'atracciones';
  }

  get pagedItems(): any[] {
    const start = this.pageIndex * this.pageSize;
    return this.items.slice(start, start + this.pageSize);
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
      const info = await this.supabase.obtenerCatalogoAdmin(this.catalogoKey);
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
      await this.supabase.actualizarOrdenCatalogoAdmin(this.catalogoKey, payload);
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
    this.editingId = Number(item.id);
    const editableKeys = this.getEditableKeys();
    this.editingDraft = editableKeys.reduce((acc, key) => {
      acc[key] = item?.[key] ?? null;
      return acc;
    }, {} as Record<string, any>);
  }

  cancelarEdicion() {
    this.editingId = null;
    this.editingDraft = {};
    this.guardandoEdicion = false;
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

      await this.supabase.actualizarCatalogoAdmin(this.catalogoKey, Number(item.id), payload);

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

  irEditarAtracciones(item: any) {
    this.router.navigate(['/admin/catalogos/atracciones/editar', Number(item.id)]);
  }
}
