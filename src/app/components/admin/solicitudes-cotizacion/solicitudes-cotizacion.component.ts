import { AfterViewInit, Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FuseSplashScreenService } from '@fuse/services/splash-screen';
import { AuthService } from 'app/core/auth/auth.service';
import { SupabaseService } from 'app/core/supabase.service';
import { ISolicitudCotizacionListado } from 'app/interface/solicitudes-cotizacion.interface';
import { EstatusComponent } from 'app/shared/estatus/estatus.component';
import { MaterialModule } from 'app/shared/material.module';

type ColumnFilterKey =
  | 'id'
  | 'cliente'
  | 'hotel'
  | 'habitaciones'
  | 'destino'
  | 'tipoDestino'
  | 'empleado'
  | 'estatus';

@Component({
  selector: 'app-solicitudes-cotizacion',
  imports: [MaterialModule, RouterLink, EstatusComponent],
  templateUrl: './solicitudes-cotizacion.component.html',
  styleUrl: './solicitudes-cotizacion.component.scss'
})
export class SolicitudesCotizacionComponent implements OnInit, AfterViewInit {
  private splashScreen = inject(FuseSplashScreenService);
  private authService = inject(AuthService);
  private supabase = inject(SupabaseService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  readonly fechaMaximaFiltro = new Date();

  displayedColumns: string[] = [
    'id',
    'fecha',
    'cliente',
    'hotel',
    'habitaciones',
    'destino',
    'tipoDestino',
    'empleado',
    'estatus',
    'acciones',
  ];

  readonly filterColumns: string[] = [
    'idFilter',
    'fechaFilter',
    'clienteFilter',
    'hotelFilter',
    'habitacionesFilter',
    'destinoFilter',
    'tipoDestinoFilter',
    'empleadoFilter',
    'estatusFilter',
    'accionesFilter',
  ];

  dataSource = new MatTableDataSource<ISolicitudCotizacionListado>([]);
  estatusOptions: string[] = [];

  quickFilter: '' | 'pendiente' | 'confirmada' | 'cancelada' = '';
  showColumnFilters = false;
  fechaFiltro = '';
  columnFilters: Record<ColumnFilterKey, string> = {
    id: '',
    cliente: '',
    hotel: '',
    habitaciones: '',
    destino: '',
    tipoDestino: '',
    empleado: '',
    estatus: '',
  };

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  async ngOnInit() {
    this.splashScreen.show();

    try {
      const data = await this.supabase.obtenerSolicitudesCotizacion();
      this.dataSource.data = await this.filtrarSolicitudesPorUsuario(data ?? []);
      this.estatusOptions = this.obtenerOpcionesEstatus(this.dataSource.data);

      if (this.paginator) this.dataSource.paginator = this.paginator;
      if (this.sort) this.dataSource.sort = this.sort;
    } finally {
      this.splashScreen.hide();
    }
  }

  private async filtrarSolicitudesPorUsuario(
    solicitudes: ISolicitudCotizacionListado[]
  ): Promise<ISolicitudCotizacionListado[]> {
    if (this.authService.isAdmin) {
      return solicitudes;
    }

    const { data, error } = await this.supabase.getClient().auth.getUser();
    if (error || !data?.user?.id) {
      return [];
    }

    const { data: empleado, error: empleadoError } = await this.supabase
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
          return data.id;
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
      const fechaFilter = this.normalize(normalized.fecha ?? '');
      const clienteFilter = this.normalize(normalized.cliente ?? '');
      const hotelFilter = this.normalize(normalized.hotel ?? '');
      const habitacionesFilter = this.normalize(normalized.habitaciones ?? '');
      const destinoFilter = this.normalize(normalized.destino ?? '');
      const tipoDestinoFilter = this.normalize(normalized.tipoDestino ?? '');
      const empleadoFilter = this.normalize(normalized.empleado ?? '');
      const estatusFilter = this.normalize(normalized.estatus ?? '');
      const fechaSolicitud = this._obtenerFechaSolicitud(data);
      const fechaSolicitudNormalizada = fechaSolicitud ? this._formatearFechaClaveLocal(fechaSolicitud) : '';

      const byColumn =
        this.normalize(data.id).includes(idFilter) &&
        (!fechaFilter || fechaSolicitudNormalizada === fechaFilter) &&
        this.normalize(data.cliente_nombre).includes(clienteFilter) &&
        this.normalize(data.hotel_nombre).includes(hotelFilter) &&
        this.normalize(this.obtenerResumenHabitaciones(data)).includes(habitacionesFilter) &&
        this.normalize(data.destino_nombre).includes(destinoFilter) &&
        this.normalize(data.tipo_destino).includes(tipoDestinoFilter) &&
        this.normalize(data.empleado_nombre).includes(empleadoFilter) &&
        this.normalize(data.estatus_nombre).includes(estatusFilter);

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

  applyColumnFilter(column: ColumnFilterKey, event: Event): void {
    this.columnFilters[column] = (event.target as HTMLInputElement)?.value ?? '';
    this.applyCombinedFilters();
  }

  setEstatusFilter(value: string | null): void {
    this.columnFilters.estatus = value ?? '';
    this.applyCombinedFilters();
  }

  clearFilter(): void {
    this.columnFilters = {
      id: '',
      cliente: '',
      hotel: '',
      habitaciones: '',
      destino: '',
      tipoDestino: '',
      empleado: '',
      estatus: '',
    };
    this.fechaFiltro = '';
    this.quickFilter = '';
    this.applyCombinedFilters();

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        estatus: null,
        fecha: null,
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
      this.normalize(this.fechaFiltro).length > 0
    );
  }

  get fechaFiltroEtiqueta(): string {
    if (!this.fechaFiltro) return '';

    const fecha = this._parseFechaSoloFechaLocal(this.fechaFiltro);
    if (!fecha) return this.fechaFiltro;

    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(fecha);
  }

  get fechaFiltroDate(): Date | null {
    return this._parseFechaSoloFechaLocal(this.fechaFiltro);
  }

  private applyCombinedFilters(): void {
    this.dataSource.filter = JSON.stringify({
      ...this.columnFilters,
      fecha: this.fechaFiltro,
    });
    this.dataSource.paginator?.firstPage();
  }

  private parseFilter(filter: string): Record<string, string> {
    if (!filter) return {};

    try {
      const parsed = JSON.parse(filter) as Record<string, string>;
      return parsed ?? {};
    } catch {
      return {};
    }
  }

  private normalize(value: unknown): string {
    return (value ?? '').toString().trim().toLowerCase();
  }

  private aplicarFiltroInicialDesdeRuta(): void {
    const estatus = (this.route.snapshot.queryParamMap.get('estatus') ?? '').trim();
    const fecha = (this.route.snapshot.queryParamMap.get('fecha') ?? '').trim();

    if (!estatus && !fecha) return;

    this.quickFilter = '';
    this.showColumnFilters = true;

    if (estatus) {
      this.setEstatusFilter(estatus);
    }

    if (fecha) {
      const fechaNormalizada = this._normalizarFechaFiltro(fecha);
      this.fechaFiltro = fechaNormalizada;
      this.applyCombinedFilters();
    }
  }

  quitarFiltroFecha(): void {
    this.fechaFiltro = '';
    this.applyCombinedFilters();

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { fecha: null },
      queryParamsHandling: 'merge',
    });
  }

  setFechaFiltroDesdeDate(valor: Date | null): void {
    this.fechaFiltro = valor ? this._normalizarFechaFiltro(this._formatearFechaClaveLocal(valor)) : '';
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
      return habitaciones.trim();
    }

    if (habitaciones && typeof habitaciones === 'object') {
      return String(habitaciones.es ?? habitaciones.traduccion ?? '').trim();
    }

    return '';
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

    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(fecha);
  }

  setFechaFiltro(value: string | null): void {
    this.fechaFiltro = this._normalizarFechaFiltro((value ?? '').trim());
    this.applyCombinedFilters();
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
