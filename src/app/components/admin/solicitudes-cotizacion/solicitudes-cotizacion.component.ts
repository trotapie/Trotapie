import { AfterViewInit, Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
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
import * as XLSX from 'xlsx';

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

  dataSource = new MatTableDataSource<ISolicitudCotizacionListado>([]);
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
    { id: 'editar', label: 'Editar cotización', icon: 'heroicons_outline:pencil-square' }
  ];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  async ngOnInit() {
    try {
      const data = await this.cotizacionesService.obtenerSolicitudesCotizacion();
      this.dataSource.data = await this.filtrarSolicitudesPorUsuario(data ?? []);
      this.estatusOptions = this.obtenerOpcionesEstatus(this.dataSource.data);
      this.empleadoOptions = this.obtenerOpcionesEmpleados(this.dataSource.data);

      if (this.paginator) this.dataSource.paginator = this.paginator;
      if (this.sort) this.dataSource.sort = this.sort;
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

    return solicitudes.filter((solicitud) => Number(solicitud.empleado_id) === empleadoId);
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.dataSource.sortingDataAccessor = (
      data: ISolicitudCotizacionListado,
      sortHeaderId: string
    ) => {
      switch (sortHeaderId) {
        case 'id':
          return Number(data.id) || 0;
        case 'fecha':
          return this._obtenerFechaSolicitud(data)?.getTime() ?? 0;
        case 'cliente':
          return data.cliente_nombre ?? '';
        case 'hotel':
          return data.hotel_nombre ?? '';
        case 'habitaciones':
          return this.obtenerResumenHabitaciones(data);
        case 'destino':
          return data.destino_nombre ?? '';
        case 'tipoDestino':
          return data.tipo_destino ?? '';
        case 'empleado':
          return data.empleado_nombre ?? '';
        case 'estatus':
          return data.estatus_nombre ?? '';
        default:
          return '';
      }
    };

    this.dataSource.filterPredicate = (
      data: ISolicitudCotizacionListado,
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

    this.aplicarFiltroInicialDesdeRuta();
  }

  ejecutarAccionCotizacion(actionId: string, solicitud: ISolicitudCotizacionListado): void {
    if (actionId === 'editar') {
      void this.router.navigate(['/admin/edicion-cotizacion', solicitud.public_id]);
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
    this.dataSource.filter = JSON.stringify({
      ...this.columnFilters,
      empleados: this.empleadosSeleccionados,
      estatuses: this.estatusSeleccionados,
      fechaDesde: this.fechaRangoFiltro.start,
      fechaHasta: this.fechaRangoFiltro.end,
    });
    this.dataSource.paginator?.firstPage();
  }

  private get solicitudesParaExportar(): ISolicitudCotizacionListado[] {
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
    return (
      formatearFolioCotizacion(item?.id) ||
      `CTRO-${String(item?.id ?? '').trim()}`
    );
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
