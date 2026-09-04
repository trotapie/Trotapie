import { AfterViewInit, Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';
import { SupabaseService } from 'app/core/supabase.service';
import { CotizacionesService } from 'app/core/cotizaciones.service';
import { formatearFolioCotizacion } from 'app/core/cotizacion-folio.util';
import { ISolicitudCotizacionListado } from 'app/interface/solicitudes-cotizacion.interface';
import { EstatusComponent } from 'app/shared/estatus/estatus.component';
import { MaterialModule } from 'app/shared/material.module';
import { DateRangeFilterComponent } from 'app/shared/date-range-filter/date-range-filter.component';
import { DateRangeFilterValue, EMPTY_DATE_RANGE } from 'app/shared/date-range-filter/date-range-filter.model';
import { TpActionMenuItem, TpActionsMenuComponent } from 'app/shared/tp-actions-menu/tp-actions-menu.component';
import { TpToastService } from 'app/shared/tp-toast/tp-toast.service';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import * as XLSX from 'xlsx';

type CotizacionTreeRow = ISolicitudCotizacionListado & {
  tipoFila: 'individual' | 'comparativa' | 'alternativa';
  parentId?: number | string;
};

type ColumnFilterKey =
  | 'id'
  | 'cliente'
  | 'correo'
  | 'telefono'
  | 'hotel'
  | 'habitaciones'
  | 'destino'
  | 'tipoDestino';

@Component({
  selector: 'app-solicitudes-cotizacion',
  imports: [MaterialModule, RouterLink, EstatusComponent, DateRangeFilterComponent, TpActionsMenuComponent],
  templateUrl: './solicitudes-cotizacion.component.html',
  styleUrl: './solicitudes-cotizacion.component.scss'
})
export class SolicitudesCotizacionComponent implements OnInit, AfterViewInit {
  private authService = inject(AuthService);
  private supabaseClient = inject(SupabaseService);
  private cotizacionesService = inject(CotizacionesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(TpToastService);
  private confirmationService = inject(FuseConfirmationService);
  readonly fechaMaximaFiltro = new Date();

  displayedColumns: string[] = [
    'fecha',
    'id',
    'cliente',
    'hotel',
    'destino',
    'habitaciones',
    'tipoDestino',
    'empleado',
    'estatus',
    'acciones',
  ];

  dataSource = new MatTableDataSource<CotizacionTreeRow>([]);
  cotizacionesRaiz: CotizacionTreeRow[] = [];
  expandedComparativas = new Set<number | string>();
  estatusOptions: string[] = [];
  empleadoOptions: string[] = [];

  quickFilter: '' | 'pendiente' | 'confirmada' | 'cancelada' = '';
  showColumnFilters = false;
  fechaRangoFiltro: DateRangeFilterValue = { ...EMPTY_DATE_RANGE };
  columnFilters: Record<ColumnFilterKey, string> = {
    id: '',
    cliente: '',
    correo: '',
    telefono: '',
    hotel: '',
    habitaciones: '',
    destino: '',
    tipoDestino: '',
  };
  empleadosSeleccionados: string[] = [];
  estatusSeleccionados: string[] = [];

  readonly accionesCotizacion: TpActionMenuItem[] = [
    { id: 'editar', label: 'Editar cotización', icon: 'heroicons_outline:pencil-square' },
    { id: 'eliminar', label: 'Eliminar cotización', icon: 'heroicons_outline:trash', danger: true },
  ];

  readonly accionesComparativa: TpActionMenuItem[] = [
    { id: 'editar', label: 'Editar comparativa', icon: 'heroicons_outline:pencil-square' },
    { id: 'eliminar', label: 'Eliminar comparativa', icon: 'heroicons_outline:trash', danger: true },
  ];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  async ngOnInit() {
    await this.cargarCotizaciones();
  }

  private async cargarCotizaciones(): Promise<void> {
    try {
      const [solicitudes, comparativas] = await Promise.all([
        this.cotizacionesService.obtenerSolicitudesCotizacion(),
        this.supabaseClient.obtenerCotizacionesMultiples(),
      ]);
      const [solicitudesVisibles, comparativasVisibles] = await Promise.all([
        this.filtrarSolicitudesPorUsuario(solicitudes ?? []),
        this.filtrarSolicitudesPorUsuario(comparativas ?? []),
      ]);
      const alternativasIds = new Set(
        comparativasVisibles.flatMap((comparativa) =>
          (comparativa.solicitudes ?? []).map((solicitud) => String(solicitud.public_id ?? solicitud.id))
        )
      );
      const individuales = solicitudesVisibles
        .filter((solicitud) => !alternativasIds.has(String(solicitud.public_id ?? solicitud.id)))
        .map((solicitud) => ({ ...solicitud, tipoFila: 'individual' as const }));
      const padres = comparativasVisibles.map((comparativa) => ({
        ...comparativa,
        hotel_nombre: this.resumenHoteles(comparativa.solicitudes ?? []),
        destino_nombre: this.resumenDestinos(comparativa.solicitudes ?? []),
        tipo_destino: this.resumenTiposDestino(comparativa.solicitudes ?? []),
        tipoFila: 'comparativa' as const,
      }));

      this.cotizacionesRaiz = [...individuales, ...padres]
        .sort((a, b) => (this._obtenerFechaSolicitud(b)?.getTime() ?? 0) - (this._obtenerFechaSolicitud(a)?.getTime() ?? 0));
      this.estatusOptions = this.obtenerOpcionesEstatus(this.cotizacionesRaiz);
      this.empleadoOptions = this.obtenerOpcionesEmpleados(this.cotizacionesRaiz);
      this.rebuildRows();

      if (this.paginator) this.dataSource.paginator = this.paginator;
    } catch {
      // handled by material table
    }
  }

  private async filtrarSolicitudesPorUsuario(
    solicitudes: ISolicitudCotizacionListado[]
  ): Promise<ISolicitudCotizacionListado[]> {
    if (this.authService.isAdmin) {
      return solicitudes;
    }

    const solicitudesActivas = solicitudes.filter((solicitud) => !this.estaEliminada(solicitud));

    const { data, error } = await this.supabaseClient.getClient().auth.getUser();
    if (error || !data?.user?.id) {
      return [];
    }

    const { data: empleado, error: empleadoError } = await this.supabaseClient
      .getClient()
      .from('empleados')
      .select('id')
      .eq('auth_user_id', data.user.id)
      .maybeSingle();

    if (empleadoError || !empleado?.id) {
      return [];
    }

    const empleadoId = Number(empleado.id);
    if (!Number.isFinite(empleadoId) || empleadoId <= 0) {
      return [];
    }

    return solicitudesActivas
      .filter((solicitud) => Number(solicitud.empleado_id) === empleadoId)
      .map((solicitud) => ({
        ...solicitud,
        solicitudes: solicitud.solicitudes?.filter((alternativa) => !this.estaEliminada(alternativa)),
      }));
  }

  private estaEliminada(solicitud: ISolicitudCotizacionListado): boolean {
    return String(solicitud.estatus_nombre ?? '').trim().toLowerCase() === 'eliminado';
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.filterPredicate = (
      data: CotizacionTreeRow,
      filter: string
    ) => {
      const normalized = this.parseFilter(filter);
      const idFilter = this.normalize(normalized.id ?? '');
      const fechaDesde = this.normalize(normalized.fechaDesde ?? '');
      const fechaHasta = this.normalize(normalized.fechaHasta ?? '');
      const clienteFilter = this.normalize(normalized.cliente ?? '');
      const correoFilter = this.normalize(normalized.correo ?? '');
      const telefonoFilter = this.normalizarTelefono(normalized.telefono);
      const hotelFilter = this.normalize(normalized.hotel ?? '');
      const habitacionesFilter = this.normalize(normalized.habitaciones ?? '');
      const destinoFilter = this.normalize(normalized.destino ?? '');
      const tipoDestinoFilter = this.normalize(normalized.tipoDestino ?? '');
      const empleadosSeleccionados = this.normalizarSeleccionMultiple(normalized.empleados);
      const estatusSeleccionados = this.normalizarSeleccionMultiple(normalized.estatuses);
      const fechaSolicitud = this._obtenerFechaSolicitud(data);
      const fechaSolicitudNormalizada = fechaSolicitud ? this._formatearFechaClaveLocal(fechaSolicitud) : '';
      const folioCotizacion = this.folioCotizacionVisual(data);

      const byColumn =
        this.normalize(folioCotizacion).includes(idFilter) &&
        (!fechaDesde || fechaSolicitudNormalizada >= fechaDesde) &&
        (!fechaHasta || fechaSolicitudNormalizada <= fechaHasta) &&
        this.normalize(data.cliente_nombre).includes(clienteFilter) &&
        this.normalize(data.cliente_email).includes(correoFilter) &&
        this.normalizarTelefono(data.cliente_telefono).includes(telefonoFilter) &&
        this.normalize(data.hotel_nombre).includes(hotelFilter) &&
        this.normalize(this.obtenerResumenHabitaciones(data)).includes(habitacionesFilter) &&
        this.normalize(data.destino_nombre).includes(destinoFilter) &&
        this.normalize(data.tipo_destino).includes(tipoDestinoFilter) &&
        this.coincideSeleccionMultiple(data.empleado_nombre, empleadosSeleccionados) &&
        this.coincideSeleccionMultiple(data.estatus_nombre, estatusSeleccionados);

      if (
        this.quickFilter === 'pendiente' &&
        (data.estatus_nombre ?? '').toUpperCase() !== 'PENDIENTE'
      ) {
        return false;
      }

      if (
        this.quickFilter === 'confirmada' &&
        (data.estatus_nombre ?? '').toUpperCase() !== 'CONFIRMADA'
      ) {
        return false;
      }

      if (
        this.quickFilter === 'cancelada' &&
        (data.estatus_nombre ?? '').toUpperCase() !== 'CANCELADA'
      ) {
        return false;
      }

      return byColumn;
    };

    this.rebuildRows();
    this.aplicarFiltroInicialDesdeRuta();
  }

  ejecutarAccionCotizacion(actionId: string, solicitud: CotizacionTreeRow): void {
    if (actionId === 'editar') {
      void this.router.navigate(['/admin/edicion-cotizacion', solicitud.public_id]);
      return;
    }

    if (actionId === 'eliminar') {
      this.solicitarEliminacionCotizacion(solicitud);
      return;
    }

    if (actionId === 'volver-pendiente') {
      this.solicitarCambioAPendiente(solicitud);
    }
  }

  accionesParaCotizacion(solicitud: ISolicitudCotizacionListado): TpActionMenuItem[] {
    if (!this.authService.isAdmin || !this.estaEliminada(solicitud)) {
      return this.accionesCotizacion;
    }

    return [
      this.accionesCotizacion[0],
      { id: 'volver-pendiente', label: 'Restaurar', icon: 'heroicons_outline:arrow-path' },
      this.accionesCotizacion[1],
    ];
  }

  ejecutarAccionComparativa(actionId: string, comparativa: CotizacionTreeRow): void {
    if (actionId === 'editar') {
      this.verComparativa(comparativa);
      return;
    }

    if (actionId === 'eliminar') {
      this.solicitarEliminacionComparativa(comparativa);
      return;
    }

    if (actionId === 'volver-pendiente') {
      this.solicitarRestauracionComparativa(comparativa);
    }
  }

  accionesParaComparativa(comparativa: CotizacionTreeRow): TpActionMenuItem[] {
    if (!this.authService.isAdmin || !this.estaEliminada(comparativa)) {
      return this.accionesComparativa;
    }

    return [
      this.accionesComparativa[0],
      { id: 'volver-pendiente', label: 'Restaurar comparativa', icon: 'heroicons_outline:arrow-path' },
      this.accionesComparativa[1],
    ];
  }

  private solicitarEliminacionCotizacion(solicitud: CotizacionTreeRow): void {
    const folio = this.folioCotizacionVisual(solicitud);
    this.confirmationService.open({
      title: 'Eliminar cotización',
      message: `¿Estás seguro de eliminar la cotización <strong>${folio}</strong>?`,
      icon: { show: true, name: 'heroicons_outline:trash', color: 'warn' },
      actions: {
        confirm: { show: true, label: 'Eliminar cotización', color: 'warn' },
        cancel: { show: true, label: 'Cancelar' },
      },
      dismissible: true,
    }).afterClosed().subscribe((resultado) => {
      if (resultado === 'confirmed') void this.eliminarCotizacion(solicitud);
    });
  }

  private solicitarCambioAPendiente(solicitud: CotizacionTreeRow): void {
    if (!this.authService.isAdmin || !this.estaEliminada(solicitud)) return;

    const folio = this.folioCotizacionVisual(solicitud);
    this.confirmationService.open({
      title: 'Restaurar cotización',
      message: `¿Deseas restaurar la cotización <strong>${folio}</strong> al estatus pendiente?`,
      icon: { show: true, name: 'heroicons_outline:arrow-path', color: 'primary' },
      actions: {
        confirm: { show: true, label: 'Restaurar', color: 'teal' },
        cancel: { show: true, label: 'Cancelar' },
      },
      dismissible: true,
    }).afterClosed().subscribe((resultado) => {
      if (resultado === 'confirmed') void this.marcarCotizacionComoPendiente(solicitud);
    });
  }

  private solicitarEliminacionComparativa(comparativa: CotizacionTreeRow): void {
    const folio = this.folioCotizacionVisual(comparativa);
    this.confirmationService.open({
      title: 'Eliminar comparativa',
      message: `¿Estás seguro de eliminar la comparativa <strong>${folio}</strong>?`,
      icon: { show: true, name: 'heroicons_outline:trash', color: 'warn' },
      actions: {
        confirm: { show: true, label: 'Eliminar comparativa', color: 'warn' },
        cancel: { show: true, label: 'Cancelar' },
      },
      dismissible: true,
    }).afterClosed().subscribe((resultado) => {
      if (resultado === 'confirmed') void this.eliminarComparativa(comparativa);
    });
  }

  private solicitarRestauracionComparativa(comparativa: CotizacionTreeRow): void {
    if (!this.authService.isAdmin || !this.estaEliminada(comparativa)) return;

    const folio = this.folioCotizacionVisual(comparativa);
    this.confirmationService.open({
      title: 'Restaurar comparativa',
      message: `¿Deseas restaurar la comparativa <strong>${folio}</strong> y todas sus cotizaciones al estatus pendiente?`,
      icon: { show: true, name: 'heroicons_outline:arrow-path', color: 'primary' },
      actions: {
        confirm: { show: true, label: 'Restaurar', color: 'teal' },
        cancel: { show: true, label: 'Cancelar' },
      },
      dismissible: true,
    }).afterClosed().subscribe((resultado) => {
      if (resultado === 'confirmed') void this.restaurarComparativa(comparativa);
    });
  }

  private async eliminarCotizacion(solicitud: CotizacionTreeRow): Promise<void> {
    try {
      await this.cotizacionesService.eliminarSolicitudCotizacion(solicitud.id);
      if (solicitud.parentId) {
        await this.supabaseClient.sincronizarEstatusCotizacionMultiple(solicitud.parentId);
      }
      await this.cargarCotizaciones();
      this.toast.show({
        title: 'Cotización eliminada',
        message: 'Se eliminó correctamente.',
        variant: 'success',
      });
    } catch (error: any) {
      this.toast.show({
        title: 'No se pudo eliminar la cotización',
        message: error?.message ?? 'Inténtalo de nuevo.',
        variant: 'error',
      });
    }
  }

  private async marcarCotizacionComoPendiente(solicitud: CotizacionTreeRow): Promise<void> {
    try {
      await this.cotizacionesService.marcarSolicitudComoPendiente(solicitud.id);
      if (solicitud.parentId) {
        await this.supabaseClient.marcarCotizacionMultipleComoPendiente(solicitud.parentId);
      }
      await this.cargarCotizaciones();
      this.toast.show({
        title: 'Cotización pendiente',
        message: 'La cotización volvió al estatus pendiente.',
        variant: 'success',
      });
    } catch (error: any) {
      this.toast.show({
        title: 'No se pudo actualizar la cotización',
        message: error?.message ?? 'Inténtalo de nuevo.',
        variant: 'error',
      });
    }
  }

  private async eliminarComparativa(comparativa: CotizacionTreeRow): Promise<void> {
    try {
      await this.supabaseClient.eliminarCotizacionMultiple(
        comparativa.id,
        (comparativa.solicitudes ?? []).map((solicitud) => solicitud.id)
      );
      this.expandedComparativas.delete(comparativa.id);
      await this.cargarCotizaciones();
      this.toast.show({
        title: 'Comparativa eliminada',
        message: 'La comparativa y sus cotizaciones se marcaron como eliminadas.',
        variant: 'success',
      });
    } catch (error: any) {
      this.toast.show({
        title: 'No se pudo eliminar la comparativa',
        message: error?.message ?? 'Inténtalo de nuevo.',
        variant: 'error',
      });
    }
  }

  private async restaurarComparativa(comparativa: CotizacionTreeRow): Promise<void> {
    try {
      await this.supabaseClient.restaurarCotizacionMultiple(comparativa.id);
      await this.cargarCotizaciones();
      this.toast.show({
        title: 'Comparativa pendiente',
        message: 'La comparativa y todas sus cotizaciones volvieron al estatus pendiente.',
        variant: 'success',
      });
    } catch (error: any) {
      this.toast.show({
        title: 'No se pudo restaurar la comparativa',
        message: error?.message ?? 'Inténtalo de nuevo.',
        variant: 'error',
      });
    }
  }

  applyColumnFilter(column: ColumnFilterKey, event: Event): void {
    this.columnFilters[column] = (event.target as HTMLInputElement)?.value ?? '';
    this.applyCombinedFilters();
  }

  setEmpleadosFiltro(values: string[] | null): void {
    this.empleadosSeleccionados = [...(values ?? [])];
    this.applyCombinedFilters();
  }

  setEstatusFilter(values: string[] | null): void {
    this.estatusSeleccionados = [...(values ?? [])];
    this.applyCombinedFilters();
  }

  clearFilter(): void {
    this.columnFilters = {
      id: '',
      cliente: '',
      correo: '',
      telefono: '',
      hotel: '',
      habitaciones: '',
      destino: '',
      tipoDestino: '',
    };
    this.empleadosSeleccionados = [];
    this.estatusSeleccionados = [];
    this.fechaRangoFiltro = { ...EMPTY_DATE_RANGE };
    this.quickFilter = '';
    this.applyCombinedFilters();

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        estatus: null,
        fecha: null,
        fechaDesde: null,
        fechaHasta: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  toggleColumnFilters(): void {
    this.showColumnFilters = !this.showColumnFilters;
  }

  setQuickFilter(v: '' | 'pendiente' | 'confirmada' | 'cancelada'): void {
    this.quickFilter = v;
    this.applyCombinedFilters();
  }

  get hasActiveFilters(): boolean {
    return (
      Object.values(this.columnFilters).some((value) => this.normalize(value).length > 0) ||
      this.empleadosSeleccionados.length > 0 ||
      this.estatusSeleccionados.length > 0 ||
      !!this.fechaRangoFiltro.start ||
      !!this.fechaRangoFiltro.end
    );
  }

  get hasSolicitudesParaExportar(): boolean {
    return this.solicitudesParaExportar.length > 0;
  }

  descargarExcel(): void {
    const solicitudes = this.solicitudesParaExportar;
    if (!solicitudes.length) return;

    const filas = solicitudes.map((solicitud) => ({
      Folio: this.folioCotizacionVisual(solicitud),
      'Fecha de cotizacion': this.fechaCotizacionVisual(solicitud),
      Cliente: solicitud.cliente_nombre ?? '',
      Correo: solicitud.cliente_email ?? '',
      Telefono: solicitud.cliente_telefono?.toString() ?? '',
      Hotel: solicitud.hotel_nombre ?? '',
      Destino: solicitud.destino_nombre ?? '',
      'Tipo de destino': solicitud.tipo_destino ?? '',
      Habitaciones: this.obtenerResumenHabitaciones(solicitud),
      'Detalle de habitaciones': this.obtenerDetalleHabitaciones(solicitud),
      Empleado: solicitud.empleado_nombre ?? '',
      Estatus: solicitud.estatus_nombre ?? '',
    }));
    const hoja = XLSX.utils.json_to_sheet(filas);
    hoja['!cols'] = [
      { wch: 16 }, { wch: 23 }, { wch: 28 }, { wch: 32 }, { wch: 16 }, { wch: 28 },
      { wch: 24 }, { wch: 20 }, { wch: 16 }, { wch: 48 }, { wch: 28 }, { wch: 18 },
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Solicitudes');
    const fecha = this._formatearFechaLocal(new Date());
    const sufijo = this.hasActiveFilters || this.quickFilter ? '-filtradas' : '';
    XLSX.writeFile(libro, `solicitudes-cotizacion${sufijo}-${fecha}.xlsx`);
  }

  private applyCombinedFilters(): void {
    this.rebuildRows();
    this.dataSource.paginator?.firstPage();
  }

  private get solicitudesParaExportar(): CotizacionTreeRow[] {
    return this.hasActiveFilters || this.quickFilter
      ? this.dataSource.filteredData
      : this.dataSource.data;
  }

  private parseFilter(filter: string): Record<string, unknown> {
    if (!filter) return {};

    try {
      const parsed = JSON.parse(filter) as Record<string, unknown>;
      return parsed ?? {};
    } catch {
      return {};
    }
  }

  private normalize(value: unknown): string {
    return (value ?? '').toString().trim().toLowerCase();
  }

  private normalizarTelefono(value: unknown): string {
    return this.normalize(value).replace(/\D/g, '');
  }

  private normalizarSeleccionMultiple(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.map((item) => this.normalize(item)).filter(Boolean);
  }

  private coincideSeleccionMultiple(value: unknown, seleccionados: string[]): boolean {
    return seleccionados.length === 0 || seleccionados.includes(this.normalize(value));
  }

  private aplicarFiltroInicialDesdeRuta(): void {
    const estatus = (this.route.snapshot.queryParamMap.get('estatus') ?? '').trim();
    const fecha = (this.route.snapshot.queryParamMap.get('fecha') ?? '').trim();
    const fechaDesde = (this.route.snapshot.queryParamMap.get('fechaDesde') ?? '').trim();
    const fechaHasta = (this.route.snapshot.queryParamMap.get('fechaHasta') ?? '').trim();

    if (!estatus && !fecha && !fechaDesde && !fechaHasta) return;

    this.quickFilter = '';
    this.showColumnFilters = true;

    if (estatus) {
      this.setEstatusFilter([estatus]);
    }

    if (fecha || fechaDesde || fechaHasta) {
      const inicio = this._normalizarFechaFiltro(fechaDesde || fecha);
      const fin = this._normalizarFechaFiltro(fechaHasta || fecha);
      this.fechaRangoFiltro = {
        start: inicio || null,
        end: fin || null,
      };
      this.applyCombinedFilters();
    }
  }

  setFechaRangoFiltro(value: DateRangeFilterValue): void {
    this.fechaRangoFiltro = {
      start: value.start ? this._normalizarFechaFiltro(value.start) : null,
      end: value.end ? this._normalizarFechaFiltro(value.end) : null,
    };
    this.applyCombinedFilters();
  }

  private obtenerOpcionesEstatus(data: ISolicitudCotizacionListado[]): string[] {
    const unicos = new Set<string>();

    for (const item of data ?? []) {
      const estatus = (item?.estatus_nombre ?? '').toString().trim();
      if (estatus) {
        unicos.add(estatus);
      }
    }

    return Array.from(unicos).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }

  private obtenerOpcionesEmpleados(data: ISolicitudCotizacionListado[]): string[] {
    const unicos = new Set<string>();

    for (const item of data ?? []) {
      const empleado = (item?.empleado_nombre ?? '').toString().trim();
      if (empleado) {
        unicos.add(empleado);
      }
    }

    return Array.from(unicos).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }

  resumenSeleccion(values: string[], fallback: string): string {
    if (!values.length) return fallback;
    if (values.length === 1) return values[0];
    return `${values.length} seleccionados`;
  }

  obtenerResumenHabitaciones(item: ISolicitudCotizacionListado): string {
    const texto = this.obtenerTextoHabitaciones(item);
    if (!texto) return 'Sin habitaciones';

    const total = this.obtenerTotalHabitaciones(item);
    return total === 1 ? '1 habitacion' : `${total} habitaciones`;
  }

  obtenerDetalleHabitaciones(item: ISolicitudCotizacionListado): string {
    const texto = this.obtenerTextoHabitaciones(item);
    if (!texto) return 'Sin detalle';

    return texto
      .split(/\r?\n+/)
      .map((linea) => linea.trim())
      .filter(Boolean)
      .join(' | ');
  }

  folioCotizacionVisual(item: ISolicitudCotizacionListado): string {
    if (this.esComparativa(item as CotizacionTreeRow)) {
      return `CMTRO-${String(item.id).padStart(3, '0')}`;
    }
    return (
      formatearFolioCotizacion(item?.id) ||
      `CTRO-${String(item?.id ?? '').trim()}`
    );
  }

  esComparativa(row: CotizacionTreeRow): boolean {
    return row.tipoFila === 'comparativa';
  }

  esAlternativa(row: CotizacionTreeRow): boolean {
    return row.tipoFila === 'alternativa';
  }

  toggleComparativa(row: CotizacionTreeRow): void {
    if (!this.esComparativa(row) || !(row.solicitudes?.length)) return;

    if (this.expandedComparativas.has(row.id)) {
      this.expandedComparativas.delete(row.id);
    } else {
      this.expandedComparativas.add(row.id);
    }
    this.rebuildRows(false);
  }

  verComparativa(row: CotizacionTreeRow): void {
    if (!row.public_id) return;
    void this.router.navigate(['/admin/cotizaciones/concentrado/detalle', row.public_id]);
  }

  private rebuildRows(resetPaginator = true): void {
    const filter = JSON.stringify({
      ...this.columnFilters,
      empleados: this.empleadosSeleccionados,
      estatuses: this.estatusSeleccionados,
      fechaDesde: this.fechaRangoFiltro.start,
      fechaHasta: this.fechaRangoFiltro.end,
    });
    const filtradas = this.cotizacionesRaiz.filter((row) => this.dataSource.filterPredicate(row, filter));
    const rows = filtradas.flatMap((row) => {
      if (!this.esComparativa(row) || !this.expandedComparativas.has(row.id)) {
        return [row];
      }

      const alternativas = (row.solicitudes ?? []).map((solicitud) => ({
        ...solicitud,
        cliente_nombre: row.cliente_nombre,
        habitaciones: row.habitaciones,
        empleado_id: row.empleado_id,
        empleado_nombre: row.empleado_nombre,
        tipoFila: 'alternativa' as const,
        parentId: row.id,
      }));
      return [row, ...alternativas];
    });
    this.dataSource.data = rows;
    if (resetPaginator) this.dataSource.paginator?.firstPage();
  }

  private resumenDestinos(solicitudes: ISolicitudCotizacionListado[]): string {
    const destinos = [...new Set(solicitudes.map((solicitud) => solicitud.destino_nombre).filter(Boolean))];
    return destinos.length === 1 ? destinos[0] : destinos.join(' · ');
  }

  private resumenHoteles(solicitudes: ISolicitudCotizacionListado[]): string {
    const hoteles = solicitudes.map((solicitud) => solicitud.hotel_nombre).filter(Boolean);
    return hoteles.length ? hoteles.join(' · ') : 'Sin alternativas';
  }

  private resumenTiposDestino(solicitudes: ISolicitudCotizacionListado[]): string {
    const tipos = new Set(
      solicitudes
        .filter((solicitud) => !this.estaEliminada(solicitud))
        .map((solicitud) => String(solicitud.tipo_destino ?? '').trim().toUpperCase())
        .filter((tipo) => tipo === 'NACIONAL' || tipo === 'INTERNACIONAL'),
    );

    if (tipos.has('NACIONAL') && tipos.has('INTERNACIONAL')) {
      return 'NACIONAL / INTERNACIONAL';
    }

    return tipos.has('INTERNACIONAL') ? 'INTERNACIONAL' : tipos.has('NACIONAL') ? 'NACIONAL' : '';
  }

  private obtenerTotalHabitaciones(item: ISolicitudCotizacionListado): number {
    const texto = this.obtenerTextoHabitaciones(item);
    if (!texto) return 0;

    const coincidenciasHabitacion = texto.match(/habitaci[oó]n\s+\d+/gi);
    if (coincidenciasHabitacion?.length) {
      return coincidenciasHabitacion.length;
    }

    const totalTexto = texto.match(/(\d+)\s*habitaci[oó]n(?:es)?/i);
    if (totalTexto) {
      const total = Number(totalTexto[1]);
      if (Number.isFinite(total) && total > 0) return total;
    }

    return 1;
  }

  private obtenerTextoHabitaciones(item: ISolicitudCotizacionListado): string {
    const habitaciones = item?.habitaciones;

    if (typeof habitaciones === 'string') {
      return this.normalizarTextoHabitaciones(habitaciones);
    }

    if (habitaciones && typeof habitaciones === 'object') {
      return this.normalizarTextoHabitaciones(
        String(habitaciones.es ?? habitaciones.traduccion ?? '')
      );
    }

    return '';
  }

  private normalizarTextoHabitaciones(texto: string): string {
    return texto
      .replace(/habitaci\uFFFDn/gi, 'Habitación')
      .replace(/ni\uFFFDo/gi, 'niño')
      .replace(/\s*\uFFFD\s*/g, ' | ')
      .trim();
  }

  private _obtenerFechaSolicitud(solicitud: ISolicitudCotizacionListado): Date | null {
    const fecha =
      solicitud.fecha_creacion ??
      solicitud.created_at ??
      (solicitud as any).createdAt ??
      null;

    return this._parseFecha(fecha);
  }

  private _parseFecha(fecha: string | Date | null | undefined): Date | null {
    if (!fecha) return null;
    if (fecha instanceof Date) {
      return Number.isNaN(fecha.getTime()) ? null : fecha;
    }

    const normalizada = this._normalizarTimestamp(fecha);
    const parsed = new Date(normalizada);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private _normalizarTimestamp(fecha: string): string {
    const pgTimestamp = fecha.trim();
    const regex = /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})(?:\.(\d+))?(?:([+-])(\d{2})(?::?(\d{2}))?)?$/;
    const match = pgTimestamp.match(regex);

    if (!match) {
      return pgTimestamp.replace(' ', 'T');
    }

    const [, fechaParte, horaParte, fraccion = '000', signo, horasOffset = '00', minutosOffset = '00'] = match;
    const milisegundos = fraccion.padEnd(3, '0').slice(0, 3);

    if (!signo) {
      return `${fechaParte}T${horaParte}.${milisegundos}`;
    }

    const offset = `${signo}${horasOffset}:${minutosOffset}`;
    return `${fechaParte}T${horaParte}.${milisegundos}${offset}`;
  }

  private _formatearFechaLocal(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private _formatearFechaClaveLocal(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private _parseFechaSoloFechaLocal(fecha: string | null | undefined): Date | null {
    if (!fecha) return null;

    const match = fecha.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [, year, month, day] = match;
      const localDate = new Date(Number(year), Number(month) - 1, Number(day));
      return Number.isNaN(localDate.getTime()) ? null : localDate;
    }

    return this._parseFecha(fecha);
  }

  fechaCotizacionVisual(item: ISolicitudCotizacionListado): string {
    const fecha = this._obtenerFechaSolicitud(item);
    if (!fecha) return 'Sin fecha';

    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const horas = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');

    return `${dia}/${mes}/${fecha.getFullYear()} | ${horas}:${minutos}`;
  }

  private _normalizarFechaFiltro(valor: string): string {
    const fecha = this._parseFechaSoloFechaLocal(valor);
    if (!fecha) return '';

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechaComparada = new Date(fecha);
    fechaComparada.setHours(0, 0, 0, 0);

    if (fechaComparada > hoy) {
      return this._formatearFechaClaveLocal(hoy);
    }

    return this._formatearFechaClaveLocal(fecha);
  }
}
