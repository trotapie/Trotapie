import { AfterViewInit, Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { FuseSplashScreenService } from '@fuse/services/splash-screen';
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

type CotizacionMultipleTreeRow = ISolicitudCotizacionListado & {
  tipoFila: 'padre' | 'solicitud';
  parentId?: number | string;
};

@Component({
  selector: 'app-concentrado-cotizaciones-multiples',
  standalone: true,
  imports: [MaterialModule, EstatusComponent],
  templateUrl: './concentrado-cotizaciones-multiples.component.html',
  styleUrl: './concentrado-cotizaciones-multiples.component.scss'
})
export class ConcentradoCotizacionesMultiplesComponent implements OnInit, AfterViewInit {
  private splashScreen = inject(FuseSplashScreenService);
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
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

  dataSource = new MatTableDataSource<CotizacionMultipleTreeRow>([]);
  cotizaciones: CotizacionMultipleTreeRow[] = [];
  expandedIds = new Set<number | string>();
  estatusOptions: string[] = [];
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
  cargando = true;
  error = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  async ngOnInit() {
    this.splashScreen.show();
    try {
      this.cargando = true;
      const data = await this.supabase.obtenerCotizacionesMultiples();
      this.cotizaciones = (data ?? []).map((item) => ({
        ...item,
        tipoFila: 'padre'
      }));
      this.estatusOptions = this.obtenerOpcionesEstatus(this.cotizaciones);
      this.rebuildRows();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo cargar el concentrado de cotizaciones multiples.';
    } finally {
      this.cargando = false;
      this.splashScreen.hide();
    }
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  applyColumnFilter(column: ColumnFilterKey, event: Event): void {
    this.columnFilters[column] = (event.target as HTMLInputElement)?.value ?? '';
    this.applyCombinedFilters();
  }

  setEstatusFilter(value: string | null): void {
    this.columnFilters.estatus = value ?? '';
    this.applyCombinedFilters();
  }

  setFechaFiltroDesdeDate(valor: Date | null): void {
    this.fechaFiltro = valor ? this.formatearFechaClaveLocal(valor) : '';
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
    this.applyCombinedFilters();
  }

  toggleColumnFilters(): void {
    this.showColumnFilters = !this.showColumnFilters;
  }

  toggleRow(row: CotizacionMultipleTreeRow): void {
    if (!this.esFilaPadre(row) || !this.tieneSolicitudes(row)) return;

    if (this.expandedIds.has(row.id)) {
      this.expandedIds.delete(row.id);
    } else {
      this.expandedIds.add(row.id);
    }

    this.rebuildRows(false);
  }

  isExpanded(row: CotizacionMultipleTreeRow): boolean {
    return this.expandedIds.has(row.id);
  }

  esFilaPadre(row: CotizacionMultipleTreeRow): boolean {
    return row.tipoFila === 'padre';
  }

  tieneSolicitudes(row: CotizacionMultipleTreeRow): boolean {
    return (row.solicitudes?.length ?? 0) > 0;
  }

  get hasActiveFilters(): boolean {
    return (
      Object.values(this.columnFilters).some((value) => this.normalize(value).length > 0) ||
      this.normalize(this.fechaFiltro).length > 0
    );
  }

  get fechaFiltroDate(): Date | null {
    return this.parseFechaSoloFechaLocal(this.fechaFiltro);
  }

  verDetalle(publicId?: string): void {
    if (!publicId) return;
    void this.router.navigate(['/admin/cotizaciones/concentrado/detalle', publicId]);
  }

  async compartirComparativa(publicId?: string): Promise<void> {
    if (!publicId) return;

    const url = `${window.location.origin}/share/comparativa/${publicId}`;
    const title = 'Comparativa de cotizacion';

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }

      await navigator.clipboard.writeText(url);
      this.snackBar.open('Enlace de comparativa copiado.', 'Cerrar', { duration: 3000 });
    } catch {
      this.snackBar.open('No se pudo compartir la comparativa.', 'Cerrar', { duration: 3000 });
    }
  }

  editarSolicitud(publicId?: string): void {
    if (!publicId) return;
    void this.router.navigate(['/admin/edicion-cotizacion', publicId]);
  }

  crearNueva(): void {
    void this.router.navigate(['/admin/cotizaciones/concentrado/nueva']);
  }

  fechaCotizacionVisual(item: ISolicitudCotizacionListado): string {
    const fecha = this.obtenerFechaCotizacion(item);
    if (!fecha) return 'Sin fecha';

    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(fecha);
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

  private applyCombinedFilters(): void {
    this.rebuildRows();
  }

  private rebuildRows(resetPage = true): void {
    const rows: CotizacionMultipleTreeRow[] = [];

    for (const cotizacion of this.cotizaciones) {
      if (!this.pasaFiltros(cotizacion)) continue;

      rows.push(cotizacion);

      if (this.expandedIds.has(cotizacion.id)) {
        const solicitudes = (cotizacion.solicitudes ?? [])
          .slice()
          .sort((a: any, b: any) => Number((a as any)?.orden ?? 0) - Number((b as any)?.orden ?? 0));

        rows.push(...solicitudes.map((solicitud) => ({
          ...solicitud,
          tipoFila: 'solicitud' as const,
          parentId: cotizacion.id,
          cliente_nombre: solicitud.cliente_nombre || cotizacion.cliente_nombre,
          cliente_email: solicitud.cliente_email || cotizacion.cliente_email,
          cliente_telefono: solicitud.cliente_telefono || cotizacion.cliente_telefono,
          empleado_nombre: solicitud.empleado_nombre || cotizacion.empleado_nombre,
          habitaciones: solicitud.habitaciones ?? cotizacion.habitaciones
        })));
      }
    }

    this.dataSource.data = rows;
    if (resetPage) this.dataSource.paginator?.firstPage();
  }

  private pasaFiltros(item: CotizacionMultipleTreeRow): boolean {
    const fechaCotizacion = this.obtenerFechaCotizacion(item);
    const fechaCotizacionNormalizada = fechaCotizacion ? this.formatearFechaClaveLocal(fechaCotizacion) : '';

    return (
      this.normalize(item.id).includes(this.normalize(this.columnFilters.id)) &&
      (!this.fechaFiltro || fechaCotizacionNormalizada === this.fechaFiltro) &&
      this.normalize(item.cliente_nombre).includes(this.normalize(this.columnFilters.cliente)) &&
      this.normalize(item.hotel_nombre).includes(this.normalize(this.columnFilters.hotel)) &&
      this.normalize(this.obtenerResumenHabitaciones(item)).includes(this.normalize(this.columnFilters.habitaciones)) &&
      this.normalize(item.destino_nombre).includes(this.normalize(this.columnFilters.destino)) &&
      this.normalize(item.tipo_destino).includes(this.normalize(this.columnFilters.tipoDestino)) &&
      this.normalize(item.empleado_nombre).includes(this.normalize(this.columnFilters.empleado)) &&
      this.normalize(item.estatus_nombre).includes(this.normalize(this.columnFilters.estatus))
    );
  }

  private normalize(value: unknown): string {
    return (value ?? '').toString().trim().toLowerCase();
  }

  private obtenerOpcionesEstatus(data: ISolicitudCotizacionListado[]): string[] {
    const unicos = new Set<string>();

    for (const item of data ?? []) {
      const estatus = (item?.estatus_nombre ?? '').toString().trim();
      if (estatus) unicos.add(estatus);

      for (const solicitud of item.solicitudes ?? []) {
        const estatusSolicitud = (solicitud?.estatus_nombre ?? '').toString().trim();
        if (estatusSolicitud) unicos.add(estatusSolicitud);
      }
    }

    return Array.from(unicos).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
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

  private obtenerFechaCotizacion(item: ISolicitudCotizacionListado): Date | null {
    const fecha = item.fecha_creacion ?? item.created_at ?? null;
    return this.parseFecha(fecha);
  }

  private parseFecha(fecha: string | Date | null | undefined): Date | null {
    if (!fecha) return null;
    if (fecha instanceof Date) {
      return Number.isNaN(fecha.getTime()) ? null : fecha;
    }

    const parsed = new Date(fecha.trim().replace(' ', 'T'));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private formatearFechaClaveLocal(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseFechaSoloFechaLocal(fecha: string | null | undefined): Date | null {
    if (!fecha) return null;

    const match = fecha.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const [, year, month, day] = match;
    const localDate = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(localDate.getTime()) ? null : localDate;
  }
}
