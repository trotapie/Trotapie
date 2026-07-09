import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, inject, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { sanitizeSvg } from 'app/shared/utils/svg-sanitizer';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogoAdminKey, CatalogosAdminService, IPoliticaTarifaAdmin } from 'app/core/catalogos-admin.service';
import { TraduccionesService } from 'app/core/traducciones.service';
import { EstatusComponent } from 'app/shared/estatus/estatus.component';
import { MaterialModule } from 'app/shared/material.module';
import { backdropFade, modalScaleFade } from 'app/shared/animations';

interface IPoliticaTraduccionPreview {
  titulo: string;
  descripcion: string;
}

interface IDescuentoTraduccionPreview {
  descripcion: string;
}

interface IAtraccionTraduccionPreview {
  nombre: string;
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
  styleUrl: './catalogo-placeholder.component.scss',
  animations: [modalScaleFade, backdropFade],
})
export class CatalogoPlaceholderComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalogosAdmin = inject(CatalogosAdminService);
  private readonly supabase = inject(TraduccionesService);
  private readonly sanitizer = inject(DomSanitizer);

  private readonly configuraciones: Record<CatalogoAdminKey, CatalogoVistaConfig> = {
    actividades: {
      columnas: [
        { key: 'id', label: 'ID' },
        { key: 'descripcion', label: 'Descripcion' },
        { key: 'clave', label: 'Clave' },
        { key: 'activo', label: 'Activo' },
        { key: 'icono', label: 'Icono' }
      ],
      tieneOrden: false,
      editableKeys: ['descripcion', 'clave', 'icono', 'activo'],
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
    tratamientos: {
      columnas: [
        { key: 'id', label: 'ID' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'abreviacion', label: 'Abreviacion' },
        { key: 'estatus', label: 'Estatus' }
      ],
      tieneOrden: false,
      editableKeys: ['nombre', 'abreviacion', 'estatus'],
      booleanKeys: ['estatus']
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
    origen_reservacion: {
      columnas: [
        { key: 'id', label: 'ID' },
        { key: 'clave', label: 'Clave' },
        { key: 'nombre_cotizador', label: 'Nombre cotizador' },
        { key: 'estatus', label: 'Estatus' }
      ],
      tieneOrden: false,
      editableKeys: ['clave', 'nombre_cotizador', 'estatus'],
      booleanKeys: ['estatus']
    },
    roles_empresa: {
      columnas: [
        { key: 'id', label: 'ID' },
        { key: 'rol', label: 'Rol' },
        { key: 'descripcion_rol', label: 'Descripcion del rol' },
        { key: 'estatus', label: 'Estatus' }
      ],
      tieneOrden: false,
      editableKeys: ['rol', 'descripcion_rol', 'estatus'],
      booleanKeys: ['estatus']
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
        { key: 'descripcion', label: 'Descripcion' }
      ],
      tieneOrden: true,
      editableKeys: ['clave']
    },
    tipos_habitacion: {
      columnas: [
        { key: 'id', label: 'ID' },
        { key: 'nombre_habitacion', label: 'Nombre habitacion' },
        { key: 'capacidad_maxima', label: 'Capacidad maxima' },
        { key: 'descripcion', label: 'Descripcion' }
      ],
      tieneOrden: false,
      editableKeys: ['nombre_habitacion', 'capacidad_maxima', 'descripcion']
    },
    atracciones: {
      columnas: [
        { key: 'id', label: 'ID' },
        { key: 'clave', label: 'Clave' },
        { key: 'orden', label: 'Orden' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'descripcion', label: 'Descripcion' },
        { key: 'icono', label: 'Icono' },
        { key: 'activo', label: 'Activo' }
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
  traduccionesDescuentoPreview: Record<string, IDescuentoTraduccionPreview> = {};
  traduciendoDescuento = false;
  traduccionesAtraccionPreview: Record<string, IAtraccionTraduccionPreview> = {};
  traduciendoAtraccion = false;
  traduccionesTipoImagenPreview: Record<string, { descripcion: string }> = {};
  traduciendoTipoImagen = false;
  politicasDisponiblesTarifa: IPoliticaTarifaAdmin[] = [];
  filtroPoliticasTarifa = '';
  mostrarFiltrosAmenidades = false;
  mostrarFiltrosTipoImagen = false;
  mostrarFiltrosAtracciones = false;
  filtrosAmenidades = {
    id: '',
    descripcion: '',
    clave: '',
    activo: ''
  };
  filtrosTipoImagen = {
    id: '',
    clave: '',
    descripcion: '',
    orden: ''
  };
  filtrosAtracciones = {
    id: '',
    clave: '',
    orden: '',
    nombre: '',
    descripcion: '',
    icono: '',
    activo: ''
  };
  politicasTarifaSeleccionadas = new Set<number>();
  pageSize = 20;
  pageIndex = 0;
  private ordenOriginalIds: number[] = [];
  private ultimaLlaveTraduccionPolitica = '';
  private ultimaLlaveTraduccionAmenidad = '';
  private ultimaLlaveTraduccionDescuento = '';
  private ultimaLlaveTraduccionAtraccion = '';
  private ultimaLlaveTraduccionTipoImagen = '';
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

  get esCatalogoConceptos(): boolean {
    return this.catalogoKey === 'conceptos';
  }

  get esCatalogoTratamientos(): boolean {
    return this.catalogoKey === 'tratamientos';
  }

  get esCatalogoIdiomas(): boolean {
    return this.catalogoKey === 'idiomas';
  }

  get esCatalogoPoliticas(): boolean {
    return this.catalogoKey === 'politicas';
  }

  get esCatalogoOrigenReservacion(): boolean {
    return this.catalogoKey === 'origen_reservacion';
  }

  get esCatalogoRolesEmpresa(): boolean {
    return this.catalogoKey === 'roles_empresa';
  }

  get esCatalogoDescuentos(): boolean {
    return this.catalogoKey === 'descuentos';
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

  get esCatalogoTipoImagen(): boolean {
    return this.catalogoKey === 'tipo_imagen';
  }

  get puedeCrearRegistro(): boolean {
    return (
      this.catalogoKey === 'actividades' ||
      this.catalogoKey === 'conceptos' ||
      this.catalogoKey === 'tratamientos' ||
      this.catalogoKey === 'continentes' ||
      this.catalogoKey === 'descuentos' ||
      this.catalogoKey === 'atracciones' ||
      this.catalogoKey === 'idiomas' ||
      this.catalogoKey === 'origen_reservacion' ||
      this.catalogoKey === 'roles_empresa' ||
      this.catalogoKey === 'politicas' ||
      this.catalogoKey === 'tipo_imagen' ||
      this.catalogoKey === 'tarifas' ||
      this.catalogoKey === 'tipos_habitacion'
    );
  }

  get usaModalEdicion(): boolean {
    return (
      this.catalogoKey === 'actividades' ||
      this.catalogoKey === 'conceptos' ||
      this.catalogoKey === 'tratamientos' ||
      this.catalogoKey === 'continentes' ||
      this.catalogoKey === 'descuentos' ||
      this.catalogoKey === 'atracciones' ||
      this.catalogoKey === 'idiomas' ||
      this.catalogoKey === 'origen_reservacion' ||
      this.catalogoKey === 'roles_empresa' ||
      this.catalogoKey === 'politicas' ||
      this.catalogoKey === 'tipo_imagen' ||
      this.catalogoKey === 'tarifas' ||
      this.catalogoKey === 'tipos_habitacion'
    );
  }

  get puedeEliminarRegistro(): boolean {
    return (
      this.catalogoKey === 'actividades' ||
      this.catalogoKey === 'conceptos' ||
      this.catalogoKey === 'tratamientos' ||
      this.catalogoKey === 'continentes' ||
      this.catalogoKey === 'descuentos' ||
      this.catalogoKey === 'atracciones' ||
      this.catalogoKey === 'idiomas' ||
      this.catalogoKey === 'origen_reservacion' ||
      this.catalogoKey === 'roles_empresa' ||
      this.catalogoKey === 'politicas' ||
      this.catalogoKey === 'tipo_imagen' ||
      this.catalogoKey === 'tarifas' ||
      this.catalogoKey === 'tipos_habitacion'
    );
  }

  get pagedItems(): any[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredItems.slice(start, start + this.pageSize);
  }

  get filteredItems(): any[] {
    if (this.esCatalogoTipoImagen) {
      return this.items.filter((item) => {
        const filtros = this.filtrosTipoImagen;
        const coincideId = this.coincideFiltro(String(item?.id ?? ''), filtros.id);
        const coincideClave = this.coincideFiltro(String(item?.clave ?? ''), filtros.clave);
        const coincideDescripcion = this.coincideFiltro(String(item?.descripcion ?? ''), filtros.descripcion);
        const coincideOrden = this.coincideFiltro(String(item?.orden ?? ''), filtros.orden);
        return coincideId && coincideClave && coincideDescripcion && coincideOrden;
      });
    }

    if (this.esCatalogoAtracciones) {
      return this.items.filter((item) => {
        const filtros = this.filtrosAtracciones;
        const coincideId = this.coincideFiltro(String(item?.id ?? ''), filtros.id);
        const coincideClave = this.coincideFiltro(String(item?.clave ?? ''), filtros.clave);
        const coincideOrden = this.coincideFiltro(String(item?.orden ?? ''), filtros.orden);
        const coincideNombre = this.coincideFiltro(String(item?.nombre ?? ''), filtros.nombre);
        const coincideDescripcion = this.coincideFiltro(String(item?.descripcion ?? ''), filtros.descripcion);
        const coincideIcono = this.coincideFiltro(String(item?.icono ?? ''), filtros.icono);
        const coincideActivo =
          !this.limpiarTexto(filtros.activo) ||
          (filtros.activo === 'activo' && Boolean(item?.activo)) ||
          (filtros.activo === 'inactivo' && !Boolean(item?.activo));

        return (
          coincideId &&
          coincideClave &&
          coincideOrden &&
          coincideNombre &&
          coincideDescripcion &&
          coincideIcono &&
          coincideActivo
        );
      });
    }

    if (!this.esCatalogoAmenidades) {
      return this.items;
    }

    return this.items.filter((item) => {
      const filtros = this.filtrosAmenidades;
      const coincideId = this.coincideFiltro(String(item?.id ?? ''), filtros.id);
      const coincideDescripcion = this.coincideFiltro(String(item?.descripcion ?? ''), filtros.descripcion);
      const coincideClave = this.coincideFiltro(String(item?.clave ?? ''), filtros.clave);
      const coincideActivo =
        !this.limpiarTexto(filtros.activo) ||
        (filtros.activo === 'activo' && Boolean(item?.activo)) ||
        (filtros.activo === 'inactivo' && !Boolean(item?.activo));

      return coincideId && coincideDescripcion && coincideClave && coincideActivo;
    });
  }

  get hayFiltrosAmenidades(): boolean {
    return Object.values(this.filtrosAmenidades).some((value) => Boolean(this.limpiarTexto(value)));
  }

  get textoBotonFiltrosAmenidades(): string {
    return this.mostrarFiltrosAmenidades ? 'Ocultar filtros' : 'Mostrar filtros';
  }

  get hayFiltrosTipoImagen(): boolean {
    return Object.values(this.filtrosTipoImagen).some((value) => Boolean(this.limpiarTexto(value)));
  }

  get textoBotonFiltrosTipoImagen(): string {
    return this.mostrarFiltrosTipoImagen ? 'Ocultar filtros' : 'Mostrar filtros';
  }

  get hayFiltrosAtracciones(): boolean {
    return Object.values(this.filtrosAtracciones).some((value) => Boolean(this.limpiarTexto(value)));
  }

  get textoBotonFiltrosAtracciones(): string {
    return this.mostrarFiltrosAtracciones ? 'Ocultar filtros' : 'Mostrar filtros';
  }

  get tieneTraduccionesPoliticaPreview(): boolean {
    return Object.keys(this.traduccionesPoliticaPreview ?? {}).length > 0;
  }

  get tieneTraduccionesAmenidadPreview(): boolean {
    return Object.keys(this.traduccionesAmenidadPreview ?? {}).length > 0;
  }

  get tieneTraduccionesDescuentoPreview(): boolean {
    return Object.keys(this.traduccionesDescuentoPreview ?? {}).length > 0;
  }

  get tieneTraduccionesAtraccionPreview(): boolean {
    return Object.keys(this.traduccionesAtraccionPreview ?? {}).length > 0;
  }

  get tieneTraduccionesTipoImagenPreview(): boolean {
    return Object.keys(this.traduccionesTipoImagenPreview ?? {}).length > 0;
  }

  get descuentoListoParaGuardar(): boolean {
    if (!this.esCatalogoDescuentos) {
      return true;
    }

    const fuente = this.modalEdicionAbierto ? this.editingDraft : this.modalCrearAbierto ? this.nuevoRegistroDraft : null;
    if (!fuente) {
      return false;
    }

    const tipoDescuento = this.limpiarTexto(String(fuente['tipo_descuento'] ?? ''));
    if (!tipoDescuento) {
      return false;
    }

    return !this.traduciendoDescuento &&
      this.ultimaLlaveTraduccionDescuento === tipoDescuento &&
      Object.keys(this.traduccionesDescuentoPreview ?? {}).length > 0;
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

    if (this.esCatalogoConceptos) {
      return 'Nuevo concepto';
    }

    if (this.esCatalogoTratamientos) {
      return 'Nuevo tratamiento';
    }

    if (this.esCatalogoOrigenReservacion) {
      return 'Nuevo origen';
    }

    if (this.esCatalogoRolesEmpresa) {
      return 'Nuevo rol';
    }

    if (this.esCatalogoAmenidades) {
      return 'Nueva actividad';
    }

    if (this.esCatalogoAtracciones) {
      return 'Nueva atraccion';
    }

    if (this.esCatalogoPoliticas) {
      return 'Nueva politica';
    }

    if (this.esCatalogoDescuentos) {
      return 'Nuevo descuento';
    }

    if (this.esCatalogoTipoImagen) {
      return 'Nuevo tipo imagen';
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

    if (this.esCatalogoConceptos) {
      return 'Captura descripcion e icono para crear el nuevo concepto.';
    }

    if (this.esCatalogoTratamientos) {
      return 'Captura nombre y abreviacion para crear el nuevo tratamiento.';
    }

    if (this.esCatalogoOrigenReservacion) {
      return 'Captura clave, nombre cotizador y estatus para crear el nuevo origen de reservacion.';
    }

    if (this.esCatalogoRolesEmpresa) {
      return 'Captura el rol, la descripcion del rol y el estatus para crear el nuevo registro.';
    }

    if (this.esCatalogoAmenidades) {
      return 'Captura descripcion, clave, icono y estatus para crear la nueva actividad.';
    }

    if (this.esCatalogoAtracciones) {
      return 'Captura clave, icono, nombre y descripcion para crear la nueva atraccion.';
    }

    if (this.esCatalogoPoliticas) {
      return 'Captura codigo, categoria y el texto en espanol para crear la nueva politica.';
    }

    if (this.esCatalogoDescuentos) {
      return 'Captura el tipo de descuento y el icono para crear un nuevo descuento.';
    }

    if (this.esCatalogoTipoImagen) {
      return 'Captura la clave y el nombre visible para crear un nuevo tipo de imagen.';
    }

    if (this.esCatalogoTarifas) {
      return 'Captura clave, nombre y estatus para crear la nueva tarifa.';
    }

    if (this.esCatalogoTiposHabitacion) {
      return 'Captura el nombre, capacidad maxima y descripcion de la habitacion.';
    }

    return 'Captura el nombre para crear el nuevo continente.';
  }

  get tituloModalEdicion(): string {
    if (this.esCatalogoIdiomas) {
      return 'Editar idioma';
    }

    if (this.esCatalogoConceptos) {
      return 'Editar concepto';
    }

    if (this.esCatalogoTratamientos) {
      return 'Editar tratamiento';
    }

    if (this.esCatalogoOrigenReservacion) {
      return 'Editar origen de reservacion';
    }

    if (this.esCatalogoRolesEmpresa) {
      return 'Editar rol de empresa';
    }

    if (this.esCatalogoAmenidades) {
      return 'Editar actividad';
    }

    if (this.esCatalogoAtracciones) {
      return 'Editar atraccion';
    }

    if (this.esCatalogoPoliticas) {
      return 'Editar politica';
    }

    if (this.esCatalogoDescuentos) {
      return 'Editar descuento';
    }

    if (this.esCatalogoTipoImagen) {
      return 'Editar tipo imagen';
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

    if (this.esCatalogoConceptos) {
      return 'Actualiza descripcion e icono del concepto.';
    }

    if (this.esCatalogoTratamientos) {
      return 'Actualiza nombre, abreviacion y estatus del tratamiento.';
    }

    if (this.esCatalogoOrigenReservacion) {
      return 'Actualiza la clave, el nombre cotizador y el estatus del origen de reservacion.';
    }

    if (this.esCatalogoRolesEmpresa) {
      return 'Actualiza el rol, la descripcion del rol y el estatus.';
    }

    if (this.esCatalogoAmenidades) {
      return 'Actualiza descripcion, clave, icono y estatus de la actividad.';
    }

    if (this.esCatalogoAtracciones) {
      return 'Actualiza clave, icono, nombre y descripcion de la atraccion.';
    }

    if (this.esCatalogoPoliticas) {
      return 'Actualiza codigo, categoria y el texto en espanol.';
    }

    if (this.esCatalogoDescuentos) {
      return 'Actualiza el tipo de descuento y el icono.';
    }

    if (this.esCatalogoTipoImagen) {
      return 'Actualiza la clave y el nombre visible del tipo de imagen.';
    }

    if (this.esCatalogoTarifas) {
      return 'Actualiza clave, nombre, estatus y revisa las politicas asignadas.';
    }

    if (this.esCatalogoTiposHabitacion) {
      return 'Actualiza el nombre, capacidad maxima y descripcion de la habitacion.';
    }

    return 'Actualiza el nombre del continente y guarda cambios.';
  }

  get textoBotonCrear(): string {
    if (this.esCatalogoIdiomas) {
      return 'Nuevo idioma';
    }

    if (this.esCatalogoConceptos) {
      return 'Nuevo concepto';
    }

    if (this.esCatalogoTratamientos) {
      return 'Nuevo tratamiento';
    }

    if (this.esCatalogoOrigenReservacion) {
      return 'Nuevo origen';
    }

    if (this.esCatalogoRolesEmpresa) {
      return 'Nuevo rol';
    }

    if (this.esCatalogoAmenidades) {
      return 'Nueva actividad';
    }

    if (this.esCatalogoAtracciones) {
      return 'Nueva atraccion';
    }

    if (this.esCatalogoPoliticas) {
      return 'Crear nueva politica';
    }

    if (this.esCatalogoDescuentos) {
      return 'Nuevo descuento';
    }

    if (this.esCatalogoTipoImagen) {
      return 'Agregar tipo imagen';
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

    if (this.esCatalogoConceptos) {
      return 'Crear concepto';
    }

    if (this.esCatalogoTratamientos) {
      return 'Crear tratamiento';
    }

    if (this.esCatalogoOrigenReservacion) {
      return 'Crear origen';
    }

    if (this.esCatalogoRolesEmpresa) {
      return 'Crear rol';
    }

    if (this.esCatalogoAmenidades) {
      return 'Crear actividad';
    }

    if (this.esCatalogoAtracciones) {
      return 'Crear atraccion';
    }

    if (this.esCatalogoPoliticas) {
      return 'Crear politica';
    }

    if (this.esCatalogoDescuentos) {
      return 'Crear descuento';
    }

    if (this.esCatalogoTipoImagen) {
      return 'Crear tipo imagen';
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

    if (this.esCatalogoConceptos) {
      return 'Concepto guardado correctamente.';
    }

    if (this.esCatalogoTratamientos) {
      return 'Tratamiento guardado correctamente.';
    }

    if (this.esCatalogoOrigenReservacion) {
      return 'Origen de reservacion guardado correctamente.';
    }

    if (this.esCatalogoRolesEmpresa) {
      return 'Rol de empresa guardado correctamente.';
    }

    if (this.esCatalogoAmenidades) {
      return 'Actividad guardada correctamente.';
    }

    if (this.esCatalogoAtracciones) {
      return 'Atraccion guardada correctamente.';
    }

    if (this.esCatalogoPoliticas) {
      return 'Politica guardada correctamente.';
    }

    if (this.esCatalogoTarifas) {
      return 'Tarifa guardada correctamente.';
    }

    if (this.esCatalogoTipoImagen) {
      return 'Tipo imagen guardado correctamente.';
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

    if (this.esCatalogoConceptos) {
      return 'Concepto creado correctamente.';
    }

    if (this.esCatalogoTratamientos) {
      return 'Tratamiento creado correctamente.';
    }

    if (this.esCatalogoOrigenReservacion) {
      return 'Origen de reservacion creado correctamente.';
    }

    if (this.esCatalogoRolesEmpresa) {
      return 'Rol de empresa creado correctamente.';
    }

    if (this.esCatalogoAmenidades) {
      return 'Actividad creada correctamente.';
    }

    if (this.esCatalogoAtracciones) {
      return 'Atraccion creada correctamente.';
    }

    if (this.esCatalogoPoliticas) {
      return 'Politica creada correctamente.';
    }

    if (this.esCatalogoDescuentos) {
      return 'Descuento creado correctamente.';
    }

    if (this.esCatalogoTarifas) {
      return 'Tarifa creada correctamente.';
    }

    if (this.esCatalogoTipoImagen) {
      return 'Tipo imagen creado correctamente.';
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

    if (this.esCatalogoConceptos) {
      return 'Concepto eliminado correctamente.';
    }

    if (this.esCatalogoTratamientos) {
      return 'Tratamiento eliminado correctamente.';
    }

    if (this.esCatalogoOrigenReservacion) {
      return 'Origen de reservacion eliminado correctamente.';
    }

    if (this.esCatalogoRolesEmpresa) {
      return 'Rol de empresa eliminado correctamente.';
    }

    if (this.esCatalogoAmenidades) {
      return 'Actividad eliminada correctamente.';
    }

    if (this.esCatalogoAtracciones) {
      return 'Atraccion eliminada correctamente.';
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
      const items = [...(info ?? [])];
      this.items = this.esCatalogoTipoImagen
        ? items.sort((a, b) => Number(a?.id ?? 0) - Number(b?.id ?? 0))
        : items;
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
      this.error = '';
      this.errorModalEdicion = '';
      this.editingId = Number(item.id);
      this.editingDraft = {
        clave: item?.clave ?? '',
        icono: item?.icono ?? '',
        nombre: item?.nombre ?? '',
        nombre_es: item?.nombre ?? '',
        descripcion: item?.descripcion ?? '',
        descripcion_es: item?.descripcion ?? '',
        orden: item?.orden ?? null,
        activo: Boolean(item?.activo)
      };
      this.traduccionesAtraccionPreview = this.normalizarTraduccionesAtraccion(item?.traducciones_preview);
      this.ultimaLlaveTraduccionAtraccion = this.obtenerLlaveTraduccionAtraccion(
        item?.nombre,
        item?.descripcion
      );
      this.modalEdicionAbierto = true;
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

    if (this.esCatalogoConceptos) {
      this.editingDraft = {
        ...this.editingDraft,
        descripcion: item?.descripcion ?? '',
        icono: item?.icono ?? ''
      };
    } else if (this.esCatalogoPoliticas) {
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
        icono: item?.icono ?? '',
        activo: Boolean(item?.activo)
      };
      this.traduccionesAmenidadPreview = item?.traducciones_preview ?? {};
      this.ultimaLlaveTraduccionAmenidad = this.limpiarTexto(item?.descripcion);
    } else if (this.esCatalogoDescuentos) {
      this.traduccionesDescuentoPreview = this.normalizarTraduccionesDescuento(item?.traducciones_preview);
      this.ultimaLlaveTraduccionDescuento = this.limpiarTexto(item?.tipo_descuento);
    } else if (this.esCatalogoTipoImagen) {
      this.editingDraft = {
        ...this.editingDraft,
        descripcion_es: item?.descripcion ?? ''
      };
      this.traduccionesTipoImagenPreview = this.normalizarTraduccionesTipoImagen(item?.traducciones_preview);
      this.ultimaLlaveTraduccionTipoImagen = this.limpiarTexto(item?.descripcion);
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
    this.limpiarVistaPreviaDescuento();
    this.limpiarVistaPreviaAtraccion();
    this.limpiarVistaPreviaTipoImagen();
    this.filtroPoliticasTarifa = '';
    this.politicasTarifaSeleccionadas.clear();
  }

  private limpiarVistaPreviaAmenidad() {
    this.traduccionesAmenidadPreview = {};
    this.ultimaLlaveTraduccionAmenidad = '';
  }

  private limpiarVistaPreviaDescuento() {
    this.traduccionesDescuentoPreview = {};
    this.ultimaLlaveTraduccionDescuento = '';
    this.traduciendoDescuento = false;
  }

  private limpiarVistaPreviaAtraccion() {
    this.traduccionesAtraccionPreview = {};
    this.ultimaLlaveTraduccionAtraccion = '';
    this.traduciendoAtraccion = false;
  }

  private limpiarVistaPreviaTipoImagen() {
    this.traduccionesTipoImagenPreview = {};
    this.ultimaLlaveTraduccionTipoImagen = '';
    this.traduciendoTipoImagen = false;
  }

  private obtenerLlaveTraduccionAtraccion(
    nombre: string | null | undefined,
    descripcion: string | null | undefined
  ): string {
    return `${this.limpiarTexto(nombre)}|${this.limpiarTexto(descripcion)}`;
  }

  private normalizarTraduccionesAtraccion(
    traducciones: Record<string, any> | null | undefined
  ): Record<string, IAtraccionTraduccionPreview> {
    return Object.entries(traducciones ?? {}).reduce((acc, [idioma, valor]) => {
      const codigoIdioma = String(idioma ?? '').toLowerCase();
      if (!codigoIdioma) {
        return acc;
      }

      acc[codigoIdioma] = {
        nombre: String(valor?.nombre ?? valor?.titulo ?? '').trim(),
        descripcion: String(valor?.descripcion ?? '').trim()
      };

      return acc;
    }, {} as Record<string, IAtraccionTraduccionPreview>);
  }

  async traducirAtraccionAlSalirDelCampo(event?: Event) {
    if (!this.esCatalogoAtracciones) {
      return;
    }

    if (event instanceof KeyboardEvent && event.key === 'Enter') {
      event.preventDefault();
    }

    await this.actualizarVistaPreviaAtraccion();
  }

  private obtenerLlaveTraduccionTipoImagen(descripcion: string | null | undefined): string {
    return this.limpiarTexto(descripcion);
  }

  private normalizarTraduccionesTipoImagen(traducciones: any): Record<string, { descripcion: string }> {
    if (!traducciones || typeof traducciones !== 'object') {
      return {};
    }

    return Object.entries(traducciones).reduce((acc, [codigo, valor]: [string, any]) => {
      const code = String(codigo ?? '').toLowerCase();
      if (!code) {
        return acc;
      }

      acc[code] = {
        descripcion: typeof valor?.descripcion === 'string' ? valor.descripcion : ''
      };

      return acc;
    }, {} as Record<string, { descripcion: string }>);
  }

  async traducirTipoImagenAlSalirDelCampo(event?: Event) {
    if (!this.esCatalogoTipoImagen) {
      return;
    }

    if (event instanceof KeyboardEvent && event.key === 'Enter') {
      event.preventDefault();
    }

    await this.actualizarVistaPreviaTipoImagen();
  }

  private async actualizarVistaPreviaTipoImagen(ignorarEstadoGuardado = false) {
    if (!this.esCatalogoTipoImagen || this.traduciendoTipoImagen) {
      return;
    }

    if (!ignorarEstadoGuardado && (this.guardandoEdicion || this.guardandoCreacion)) {
      return;
    }

    const fuente = this.modalEdicionAbierto ? this.editingDraft : this.modalCrearAbierto ? this.nuevoRegistroDraft : null;
    if (!fuente) {
      return;
    }

    const descripcion = this.limpiarTexto(String(fuente['descripcion_es'] ?? ''));
    if (!descripcion) {
      this.limpiarVistaPreviaTipoImagen();
      return;
    }

    const llaveActual = this.obtenerLlaveTraduccionTipoImagen(descripcion);
    if (llaveActual === this.ultimaLlaveTraduccionTipoImagen && Object.keys(this.traduccionesTipoImagenPreview).length > 0) {
      return;
    }

    this.traduciendoTipoImagen = true;

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

      this.traduccionesTipoImagenPreview = concentrado;
      this.ultimaLlaveTraduccionTipoImagen = llaveActual;
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo traducir el tipo de imagen.';
    } finally {
      this.traduciendoTipoImagen = false;
    }
  }

  private async actualizarVistaPreviaAtraccion(ignorarEstadoGuardado = false) {
    if (!this.esCatalogoAtracciones || this.traduciendoAtraccion) {
      return;
    }

    if (!ignorarEstadoGuardado && (this.guardandoEdicion || this.guardandoCreacion)) {
      return;
    }

    const fuente = this.modalEdicionAbierto ? this.editingDraft : this.modalCrearAbierto ? this.nuevoRegistroDraft : null;
    if (!fuente) {
      return;
    }

    const nombre = this.limpiarTexto(String(fuente['nombre'] ?? fuente['nombre_es'] ?? ''));
    const descripcion = this.limpiarTexto(String(fuente['descripcion'] ?? fuente['descripcion_es'] ?? ''));

    if (!nombre && !descripcion) {
      this.limpiarVistaPreviaAtraccion();
      return;
    }

    const llaveActual = this.obtenerLlaveTraduccionAtraccion(nombre, descripcion);
    if (llaveActual === this.ultimaLlaveTraduccionAtraccion && Object.keys(this.traduccionesAtraccionPreview).length > 0) {
      return;
    }

    this.traduciendoAtraccion = true;

    try {
      const traducciones = await this.supabase.traducirDesdeEspanol({
        title: nombre,
        description: descripcion
      });

      const concentrado = this.idiomasVistaPolitica.reduce((acc, idioma) => {
        const traduccionIdioma = traducciones?.[idioma.code];
        if (!traduccionIdioma) {
          return acc;
        }

        acc[idioma.code] = {
          nombre: typeof traduccionIdioma.title === 'string' ? traduccionIdioma.title : '',
          descripcion: typeof traduccionIdioma.description === 'string' ? traduccionIdioma.description : ''
        };

        return acc;
      }, {} as Record<string, IAtraccionTraduccionPreview>);

      concentrado['es'] = {
        nombre,
        descripcion
      };

      this.traduccionesAtraccionPreview = concentrado;
      this.ultimaLlaveTraduccionAtraccion = llaveActual;
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo traducir la atraccion.';
    } finally {
      this.traduciendoAtraccion = false;
    }
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
      this.error = error?.message ?? 'No se pudo traducir la actividad.';
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
        const icono = String(this.editingDraft['icono'] ?? '').trim();

        if (!descripcion || !clave) {
          this.errorModalEdicion = 'Descripcion y clave son obligatorias para editar una actividad.';
          this.guardandoEdicion = false;
          return;
        }

        const payload = {
          descripcion,
          clave,
          icono,
          activo: Boolean(this.editingDraft['activo'])
        };

        await this.catalogosAdmin.actualizarCatalogoAdmin('actividades', this.editingId, payload);
        this.items = this.items.map((current) =>
          Number(current.id) === this.editingId
            ? { ...current, ...payload }
            : current
        );
      } else if (this.esCatalogoConceptos) {
        const descripcion = String(this.editingDraft['descripcion'] ?? '').trim();
        const icono = String(this.editingDraft['icono'] ?? '').trim();

        if (!descripcion) {
          this.errorModalEdicion = 'La descripcion es obligatoria para editar un concepto.';
          this.guardandoEdicion = false;
          return;
        }

        const payload = {
          descripcion,
          icono
        };

        await this.catalogosAdmin.actualizarCatalogoAdmin('conceptos', this.editingId, payload);
        this.items = this.items.map((current) =>
          Number(current.id) === this.editingId
            ? { ...current, ...payload }
            : current
        );
      } else if (this.esCatalogoTratamientos) {
        const nombre = String(this.editingDraft['nombre'] ?? '').trim();
        const abreviacion = String(this.editingDraft['abreviacion'] ?? '').trim();
        const estatus = Boolean(this.editingDraft['estatus']);

        if (!nombre || !abreviacion) {
          this.errorModalEdicion = 'Nombre y abreviacion son obligatorios para editar un tratamiento.';
          this.guardandoEdicion = false;
          return;
        }

        const payload = {
          nombre,
          abreviacion,
          estatus
        };

        await this.catalogosAdmin.actualizarCatalogoAdmin('tratamientos', this.editingId, payload);
        this.items = this.items.map((current) =>
          Number(current.id) === this.editingId
            ? { ...current, ...payload }
            : current
        );
      } else if (this.esCatalogoOrigenReservacion) {
        const clave = String(this.editingDraft['clave'] ?? '').trim();
        const nombreCotizador = String(this.editingDraft['nombre_cotizador'] ?? '').trim();
        const estatus = Boolean(this.editingDraft['estatus']);

        if (!clave || !nombreCotizador) {
          this.errorModalEdicion = 'Clave y nombre cotizador son obligatorios para editar un origen de reservacion.';
          this.guardandoEdicion = false;
          return;
        }

        const payload = {
          clave,
          nombre_cotizador: nombreCotizador,
          estatus
        };

        await this.catalogosAdmin.actualizarCatalogoAdmin('origen_reservacion', this.editingId, payload);
        this.items = this.items.map((current) =>
          Number(current.id) === this.editingId
            ? { ...current, ...payload }
            : current
        );
      } else if (this.esCatalogoRolesEmpresa) {
        const rol = String(this.editingDraft['rol'] ?? '').trim();
        const descripcionRol = String(this.editingDraft['descripcion_rol'] ?? '').trim();
        const estatus = Boolean(this.editingDraft['estatus']);

        if (!rol || !descripcionRol) {
          this.errorModalEdicion = 'Rol y descripcion del rol son obligatorios para editar un puesto o rol.';
          this.guardandoEdicion = false;
          return;
        }

        const payload = {
          rol,
          descripcion_rol: descripcionRol,
          estatus
        };

        await this.catalogosAdmin.actualizarCatalogoAdmin('roles_empresa', this.editingId, payload);
        this.items = this.items.map((current) =>
          Number(current.id) === this.editingId
            ? { ...current, ...payload }
            : current
        );
      } else if (this.esCatalogoAtracciones) {
        const clave = String(this.editingDraft['clave'] ?? '').trim();
        const icono = String(this.editingDraft['icono'] ?? '').trim();
        const nombre = String(this.editingDraft['nombre'] ?? this.editingDraft['nombre_es'] ?? '').trim();
        const descripcion = String(this.editingDraft['descripcion'] ?? this.editingDraft['descripcion_es'] ?? '').trim();
        const orden = this.parseNumber(this.editingDraft['orden']);

        if (!clave || !nombre || !descripcion || !Number.isFinite(Number(orden))) {
          this.errorModalEdicion = 'Clave, nombre, descripcion y orden son obligatorios para editar una atraccion.';
          this.guardandoEdicion = false;
          return;
        }

        await this.actualizarVistaPreviaAtraccion(true);

        const payload = {
          clave,
          icono,
          orden,
          activo: Boolean(this.editingDraft['activo']),
          nombre,
          descripcion
        };

        await this.catalogosAdmin.actualizarCatalogoAdmin('atracciones', this.editingId, payload);
        this.items = this.items.map((current) =>
          Number(current.id) === this.editingId
            ? {
              ...current,
              clave,
              icono,
              orden,
              activo: Boolean(this.editingDraft['activo']),
              nombre,
              descripcion,
              traducciones_preview: this.traduccionesAtraccionPreview
            }
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
        const capacidadMaxima = this.parseNumber(this.editingDraft['capacidad_maxima']);
        const descripcion = String(this.editingDraft['descripcion'] ?? '').trim();

        if (!nombreHabitacion) {
          this.errorModalEdicion = 'El nombre de la habitacion es obligatorio para editar.';
          this.guardandoEdicion = false;
          return;
        }

        const payload = {
          nombre_habitacion: nombreHabitacion,
          capacidad_maxima: capacidadMaxima,
          descripcion
        };

        await this.catalogosAdmin.actualizarCatalogoAdmin('tipos_habitacion', this.editingId, payload);
        this.items = this.items.map((current) =>
          Number(current.id) === this.editingId
            ? { ...current, ...payload }
              : current
        );
      } else if (this.esCatalogoDescuentos) {
        const tipoDescuento = String(this.editingDraft['tipo_descuento'] ?? '').trim();
        const icono = String(this.editingDraft['icono'] ?? '').trim();

        if (!tipoDescuento) {
          this.errorModalEdicion = 'El tipo de descuento es obligatorio para editar.';
          this.guardandoEdicion = false;
          return;
        }

        if (!this.descuentoListoParaGuardar) {
          this.errorModalEdicion = 'Espera a que las traducciones esten listas antes de guardar.';
          this.guardandoEdicion = false;
          return;
        }

        const payload = {
          tipo_descuento: tipoDescuento,
          icono
        };

        await this.catalogosAdmin.actualizarCatalogoAdmin(this.catalogoKey, this.editingId, payload);
        this.items = this.items.map((current) =>
          Number(current.id) === this.editingId
            ? {
              ...current,
              ...payload
            }
            : current
        );
      } else if (this.esCatalogoTipoImagen) {
        const clave = String(this.editingDraft['clave'] ?? '').trim();
        const descripcionEs = String(this.editingDraft['descripcion_es'] ?? '').trim();

        if (!clave) {
          this.errorModalEdicion = 'La clave es obligatoria para editar un tipo de imagen.';
          this.guardandoEdicion = false;
          return;
        }

        if (!descripcionEs) {
          this.errorModalEdicion = 'La descripcion en español es obligatoria para editar un tipo de imagen.';
          this.guardandoEdicion = false;
          return;
        }

        await this.actualizarVistaPreviaTipoImagen(true);

        const payload = {
          clave,
          descripcion_es: descripcionEs
        };

        await this.catalogosAdmin.actualizarCatalogoAdmin('tipo_imagen', this.editingId, payload);
        this.items = this.items.map((current) =>
          Number(current.id) === this.editingId
            ? {
              ...current,
              clave,
              descripcion: descripcionEs,
              traducciones_preview: this.traduccionesTipoImagenPreview
            }
            : current
        );
      } else {
        const nombre = String(this.editingDraft['nombre'] ?? '').trim();
        if (!nombre) {
          this.errorModalEdicion = this.esCatalogoTratamientos
            ? 'El nombre del tratamiento es obligatorio.'
            : 'El nombre del continente es obligatorio.';
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
        icono: '',
        activo: true
      };
    } else if (this.esCatalogoConceptos) {
      this.nuevoRegistroDraft = {
        ...this.nuevoRegistroDraft,
        descripcion: '',
        icono: ''
      };
    } else if (this.esCatalogoTratamientos) {
      this.nuevoRegistroDraft = {
        ...this.nuevoRegistroDraft,
        nombre: '',
        abreviacion: '',
        estatus: true
      };
    } else if (this.esCatalogoOrigenReservacion) {
      this.nuevoRegistroDraft = {
        ...this.nuevoRegistroDraft,
        clave: '',
        nombre_cotizador: '',
        estatus: true
      };
    } else if (this.esCatalogoRolesEmpresa) {
      this.nuevoRegistroDraft = {
        ...this.nuevoRegistroDraft,
        rol: '',
        descripcion_rol: '',
        estatus: true
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
    } else if (this.esCatalogoDescuentos) {
      this.nuevoRegistroDraft = {
        ...this.nuevoRegistroDraft,
        tipo_descuento: '',
        icono: ''
      };
      this.limpiarVistaPreviaDescuento();
    } else if (this.esCatalogoAtracciones) {
      this.nuevoRegistroDraft = {
        ...this.nuevoRegistroDraft,
        clave: '',
        icono: '',
        nombre: '',
        nombre_es: '',
        descripcion: '',
        descripcion_es: '',
        orden: this.items.reduce((max, current) => Math.max(max, Number(current?.orden ?? 0)), 0) + 1,
        activo: true
      };
      this.limpiarVistaPreviaAtraccion();
    } else if (this.esCatalogoTipoImagen) {
      this.nuevoRegistroDraft = {
        ...this.nuevoRegistroDraft,
        clave: '',
        descripcion_es: ''
      };
      this.limpiarVistaPreviaTipoImagen();
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
        capacidad_maxima: null,
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
    this.limpiarVistaPreviaDescuento();
    this.limpiarVistaPreviaAtraccion();
    this.limpiarVistaPreviaTipoImagen();
  }

  abrirModalEliminar(item: any) {
    if (!this.puedeEliminarRegistro) {
      return;
    }

    this.error = '';
    this.errorModalEliminar = '';
    const codigo = String(
      item?.tipo_descuento ??
      item?.rol ??
      item?.descripcion_rol ??
      item?.codigo ??
      item?.clave ??
      item?.abreviacion ??
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
      } else if (this.esCatalogoConceptos) {
        const descripcion = String(this.nuevoRegistroDraft['descripcion'] ?? '').trim();
        const icono = String(this.nuevoRegistroDraft['icono'] ?? '').trim();

        if (!descripcion) {
          this.errorModalCreacion = 'La descripcion es obligatoria para crear un concepto.';
          this.guardandoCreacion = false;
          return;
        }

        await this.catalogosAdmin.crearCatalogoAdmin(this.catalogoKey, {
          descripcion,
          icono
        });
      } else if (this.esCatalogoTratamientos) {
        const nombre = String(this.nuevoRegistroDraft['nombre'] ?? '').trim();
        const abreviacion = String(this.nuevoRegistroDraft['abreviacion'] ?? '').trim();
        const estatus = Boolean(this.nuevoRegistroDraft['estatus']);

        if (!nombre || !abreviacion) {
          this.errorModalCreacion = 'Nombre y abreviacion son obligatorios para crear un tratamiento.';
          this.guardandoCreacion = false;
          return;
        }

        await this.catalogosAdmin.crearCatalogoAdmin(this.catalogoKey, {
          nombre,
          abreviacion,
          estatus
        });
      } else if (this.esCatalogoOrigenReservacion) {
        const clave = String(this.nuevoRegistroDraft['clave'] ?? '').trim();
        const nombreCotizador = String(this.nuevoRegistroDraft['nombre_cotizador'] ?? '').trim();
        const estatus = Boolean(this.nuevoRegistroDraft['estatus']);

        if (!clave || !nombreCotizador) {
          this.errorModalCreacion = 'Clave y nombre cotizador son obligatorios para crear un origen de reservacion.';
          this.guardandoCreacion = false;
          return;
        }

        await this.catalogosAdmin.crearCatalogoAdmin(this.catalogoKey, {
          clave,
          nombre_cotizador: nombreCotizador,
          estatus
        });
      } else if (this.esCatalogoRolesEmpresa) {
        const rol = String(this.nuevoRegistroDraft['rol'] ?? '').trim();
        const descripcionRol = String(this.nuevoRegistroDraft['descripcion_rol'] ?? '').trim();
        const estatus = Boolean(this.nuevoRegistroDraft['estatus']);

        if (!rol || !descripcionRol) {
          this.errorModalCreacion = 'Rol y descripcion del rol son obligatorios para crear un puesto o rol.';
          this.guardandoCreacion = false;
          return;
        }

        await this.catalogosAdmin.crearCatalogoAdmin(this.catalogoKey, {
          rol,
          descripcion_rol: descripcionRol,
          estatus
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
      } else if (this.esCatalogoDescuentos) {
        const tipoDescuento = String(this.nuevoRegistroDraft['tipo_descuento'] ?? '').trim();
        const icono = String(this.nuevoRegistroDraft['icono'] ?? '').trim();

        if (!tipoDescuento) {
          this.errorModalCreacion = 'El tipo de descuento es obligatorio para crear un descuento.';
          this.guardandoCreacion = false;
          return;
        }

        if (!this.descuentoListoParaGuardar) {
          this.errorModalCreacion = 'Espera a que las traducciones esten listas antes de guardar.';
          this.guardandoCreacion = false;
          return;
        }

        await this.catalogosAdmin.crearCatalogoAdmin(this.catalogoKey, {
          tipo_descuento: tipoDescuento,
          icono
        });
      } else if (this.esCatalogoAtracciones) {
        const clave = String(this.nuevoRegistroDraft['clave'] ?? '').trim();
        const icono = String(this.nuevoRegistroDraft['icono'] ?? '').trim();
        const nombre = String(this.nuevoRegistroDraft['nombre'] ?? this.nuevoRegistroDraft['nombre_es'] ?? '').trim();
        const descripcion = String(this.nuevoRegistroDraft['descripcion'] ?? this.nuevoRegistroDraft['descripcion_es'] ?? '').trim();
        const orden = this.parseNumber(this.nuevoRegistroDraft['orden']);

        if (!clave || !nombre || !descripcion || !Number.isFinite(Number(orden))) {
          this.errorModalCreacion = 'Clave, nombre, descripcion y orden son obligatorios para crear una atraccion.';
          this.guardandoCreacion = false;
          return;
        }

        await this.actualizarVistaPreviaAtraccion(true);

        await this.catalogosAdmin.crearCatalogoAdmin(this.catalogoKey, {
          clave,
          icono,
          orden,
          activo: Boolean(this.nuevoRegistroDraft['activo']),
          nombre,
          descripcion
        });
      } else if (this.esCatalogoTipoImagen) {
        const clave = String(this.nuevoRegistroDraft['clave'] ?? '').trim();
        const descripcionEs = String(this.nuevoRegistroDraft['descripcion_es'] ?? '').trim();

        if (!clave) {
          this.errorModalCreacion = 'La clave es obligatoria para crear un tipo de imagen.';
          this.guardandoCreacion = false;
          return;
        }

        if (!descripcionEs) {
          this.errorModalCreacion = 'La descripcion en español es obligatoria para crear un tipo de imagen.';
          this.guardandoCreacion = false;
          return;
        }

        await this.actualizarVistaPreviaTipoImagen(true);

        await this.catalogosAdmin.crearCatalogoAdmin(this.catalogoKey, {
          clave,
          descripcion_es: descripcionEs
        });
      } else if (this.esCatalogoAmenidades) {
        const descripcion = String(this.nuevoRegistroDraft['descripcion'] ?? '').trim();
        const clave = String(this.nuevoRegistroDraft['clave'] ?? '').trim();
        const icono = String(this.nuevoRegistroDraft['icono'] ?? '').trim();

        if (!descripcion || !clave) {
          this.errorModalCreacion = 'Descripcion y clave son obligatorias para crear una actividad.';
          this.guardandoCreacion = false;
          return;
        }

        await this.catalogosAdmin.crearCatalogoAdmin(this.catalogoKey, {
          descripcion,
          clave,
          icono,
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
        const capacidadMaxima = this.parseNumber(this.nuevoRegistroDraft['capacidad_maxima']);
        const descripcion = String(this.nuevoRegistroDraft['descripcion'] ?? '').trim();

        if (!nombreHabitacion) {
          this.errorModalCreacion = 'El nombre de la habitacion es obligatorio.';
          this.guardandoCreacion = false;
          return;
        }

        await this.catalogosAdmin.crearCatalogoAdmin(this.catalogoKey, {
          nombre_habitacion: nombreHabitacion,
          capacidad_maxima: capacidadMaxima,
          descripcion
        });
      } else {
        const nombre = String(this.nuevoRegistroDraft['nombre'] ?? '').trim();
        const abreviacion = String(this.nuevoRegistroDraft['abreviacion'] ?? '').trim();

        if (this.esCatalogoTratamientos && (!nombre || !abreviacion)) {
          this.errorModalCreacion = 'Nombre y abreviacion son obligatorios para crear un tratamiento.';
          this.guardandoCreacion = false;
          return;
        }

        if (!nombre) {
          this.errorModalCreacion = this.esCatalogoTratamientos
            ? 'El nombre del tratamiento es obligatorio.'
            : 'El nombre del continente es obligatorio.';
          this.guardandoCreacion = false;
          return;
        }

        await this.catalogosAdmin.crearCatalogoAdmin(this.catalogoKey, this.esCatalogoTratamientos
          ? { nombre, abreviacion }
          : { nombre });
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

  getIconoPreview(icono: string | null | undefined): string {
    return String(icono ?? '').trim();
  }

  puedePrevisualizarIcono(icono: string | null | undefined): boolean {
    return Boolean(this.getIconoPreview(icono));
  }

  esSvgIcono(icono: string | null | undefined): boolean {
    return this.getIconoPreview(icono).toLowerCase().includes('<svg');
  }

  getIconoPreviewSeguro(icono: string | null | undefined): SafeHtml | null {
    const contenido = this.getIconoPreview(icono);
    if (!contenido || !this.esSvgIcono(contenido)) {
      return null;
    }

    return this.sanitizer.bypassSecurityTrustHtml(sanitizeSvg(contenido));
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

  onFiltrosAmenidadesChange() {
    if (!this.esCatalogoAmenidades) {
      return;
    }

    this.pageIndex = 0;
  }

  onFiltrosTipoImagenChange() {
    if (!this.esCatalogoTipoImagen) {
      return;
    }

    this.pageIndex = 0;
  }

  onFiltrosAtraccionesChange() {
    if (!this.esCatalogoAtracciones) {
      return;
    }

    this.pageIndex = 0;
  }

  toggleFiltrosAmenidades() {
    this.mostrarFiltrosAmenidades = !this.mostrarFiltrosAmenidades;
  }

  toggleFiltrosTipoImagen() {
    this.mostrarFiltrosTipoImagen = !this.mostrarFiltrosTipoImagen;
  }

  toggleFiltrosAtracciones() {
    this.mostrarFiltrosAtracciones = !this.mostrarFiltrosAtracciones;
  }

  limpiarFiltrosAmenidades() {
    this.filtrosAmenidades = {
      id: '',
      descripcion: '',
      clave: '',
      activo: ''
    };
    this.pageIndex = 0;
  }

  limpiarFiltrosTipoImagen() {
    this.filtrosTipoImagen = {
      id: '',
      clave: '',
      descripcion: '',
      orden: ''
    };
    this.pageIndex = 0;
  }

  limpiarFiltrosAtracciones() {
    this.filtrosAtracciones = {
      id: '',
      clave: '',
      orden: '',
      nombre: '',
      descripcion: '',
      icono: '',
      activo: ''
    };
    this.pageIndex = 0;
  }

  getGlobalIndex(localIndex: number): number {
    return this.pageIndex * this.pageSize + localIndex;
  }

  getValor(item: any, key: string, index: number): string {
    const valor = item?.[key];

    if (key === 'orden' && this.esCatalogoAtracciones) {
      return valor === null || valor === undefined || valor === '' ? '-' : String(valor);
    }

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

  private normalizarTraduccionesDescuento(
    traducciones: Record<string, IDescuentoTraduccionPreview> | null | undefined
  ): Record<string, IDescuentoTraduccionPreview> {
    return Object.entries(traducciones ?? {}).reduce((acc, [idioma, valor]) => {
      const codigoIdioma = String(idioma ?? '').toLowerCase();
      if (!codigoIdioma) {
        return acc;
      }

      acc[codigoIdioma] = {
        descripcion: String(valor?.descripcion ?? '').trim()
      };

      return acc;
    }, {} as Record<string, IDescuentoTraduccionPreview>);
  }

  async traducirDescuentoAlSalirDelCampo(event?: Event) {
    if (!this.esCatalogoDescuentos) {
      return;
    }

    if (event instanceof KeyboardEvent && event.key === 'Enter') {
      event.preventDefault();
    }

    await this.actualizarVistaPreviaDescuento();
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

  private obtenerLlaveTraduccionDescuento(tipoDescuento: string | null | undefined): string {
    return this.limpiarTexto(tipoDescuento);
  }

  private async actualizarVistaPreviaDescuento(): Promise<boolean> {
    if (!this.esCatalogoDescuentos || this.traduciendoDescuento || this.guardandoEdicion || this.guardandoCreacion) {
      return true;
    }

    const fuente = this.modalEdicionAbierto ? this.editingDraft : this.modalCrearAbierto ? this.nuevoRegistroDraft : null;
    if (!fuente) {
      return true;
    }

    const tipoDescuento = this.limpiarTexto(String(fuente['tipo_descuento'] ?? ''));
    if (!tipoDescuento) {
      this.traduccionesDescuentoPreview = {};
      this.ultimaLlaveTraduccionDescuento = '';
      return true;
    }

    const llaveActual = this.obtenerLlaveTraduccionDescuento(tipoDescuento);
    if (llaveActual === this.ultimaLlaveTraduccionDescuento && Object.keys(this.traduccionesDescuentoPreview).length > 0) {
      return true;
    }

    this.traduciendoDescuento = true;

    try {
      const traducciones = await this.supabase.traducirDesdeEspanol({
        title: '',
        description: tipoDescuento
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
      }, {} as Record<string, IDescuentoTraduccionPreview>);

      concentrado['es'] = {
        descripcion: tipoDescuento
      };

      this.traduccionesDescuentoPreview = concentrado;
      this.ultimaLlaveTraduccionDescuento = llaveActual;
      return true;
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo traducir el descuento.';
      return false;
    } finally {
      this.traduciendoDescuento = false;
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

  private parseNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private coincideFiltro(valor: string, filtro: string): boolean {
    const normalizadoFiltro = this.limpiarTexto(filtro).toLowerCase();
    if (!normalizadoFiltro) {
      return true;
    }

    return this.limpiarTexto(valor).toLowerCase().includes(normalizadoFiltro);
  }

  irEditarAtracciones(item: any) {
    this.router.navigate(['/admin/catalogos/atracciones/editar', Number(item.id)]);
  }
}
