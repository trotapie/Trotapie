import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ApexOptions } from 'apexcharts';
import { Router } from '@angular/router';
import { FuseConfigService, Scheme } from '@fuse/services/config';
import { AuthService } from 'app/core/auth/auth.service';
import { CatalogosAdminService } from 'app/core/catalogos-admin.service';
import { SupabaseService } from 'app/core/supabase.service';
import { CotizacionesService } from 'app/core/cotizaciones.service';
import { DestinosService } from 'app/core/destinos.service';
import { EmpleadosService } from 'app/core/empleados.service';
import { ISolicitudCotizacionListado } from 'app/interface/solicitudes-cotizacion.interface';
import { MaterialModule } from 'app/shared/material.module';
import { Subject, takeUntil } from 'rxjs';

type RankingItem = { nombre: string; total: number };
type SerieUltimosDias = { labels: string[]; series: number[]; fechas: string[] };

@Component({
  selector: 'app-admin',
  imports: [MaterialModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit, OnDestroy {
  private _supabase = inject(SupabaseService);
  private _cotizacionesService = inject(CotizacionesService);
  private _destinosService = inject(DestinosService);
  private _empleadosService = inject(EmpleadosService);
  private _authService = inject(AuthService);
  private _catalogosAdmin = inject(CatalogosAdminService);
  private _router = inject(Router);
  private _fuseConfigService = inject(FuseConfigService);
  private _unsubscribeAll = new Subject<void>();
  private _solicitudesActuales: ISolicitudCotizacionListado[] = [];

  isLoading = false;
  errorMessage = '';
  updatedAt: Date | null = null;
  warnings: string[] = [];
  esVistaPersonal = false;
  nombreEmpleadoActual = '';
  empleadoActualId: number | null = null;

  totalSolicitudes = 0;
  totalCotizadas = 0;
  totalPendientes = 0;
  totalCanceladas = 0;
  totalUltimos30Dias = 0;
  totalOtras = 0;

  tasaCotizacion = 0;
  tasaPendientes = 0;
  promedioSolicitudesDia30 = 0;

  totalDestinos = 0;
  totalHoteles = 0;
  totalEmpleados = 0;
  totalContinentes = 0;
  totalTiposDestino = 0;
  totalIdiomas = 0;
  totalCatalogoAtracciones = 0;
  totalTiposHabitacion = 0;

  destinosEnSolicitudes = 0;
  hotelesEnSolicitudes = 0;
  empleadosConActividad = 0;

  topHotelesCotizados: RankingItem[] = [];
  topDestinosCotizados: RankingItem[] = [];
  topEmpleadosCotizados: RankingItem[] = [];

  chartResumen: ApexOptions = {};
  chartDistribucion: ApexOptions = {};
  chartSolicitudes30Dias: ApexOptions = {};
  chartTipoDestino: ApexOptions = {};
  chartTopHoteles: ApexOptions = {};
  chartTopDestinos: ApexOptions = {};
  chartTopEmpleados: ApexOptions = {};
  private fechasTendencia30Dias: string[] = [];
  private scheme: 'light' | 'dark' = 'light';

  get tituloDashboard(): string {
    return this._authService.isAdmin ? 'Dashboard General del Sitio' : 'Mi Dashboard';
  }

  get subtituloDashboard(): string {
    return this._authService.isAdmin
      ? 'Vista integral de operacion comercial, solicitudes, catalogos y comportamiento de cotizaciones.'
      : 'Vista personal con tu actividad y solicitudes asociadas a tu usuario.';
  }

  get mostrarSeccionesAdmin(): boolean {
    return this._authService.isAdmin;
  }

  ngOnInit(): void {
    this._fuseConfigService.config$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((config) => {
        this.scheme = this._resolveScheme(config.scheme);

        if (this._solicitudesActuales.length > 0) {
          this._prepararGraficas(this._solicitudesActuales);
        }
      });

    void this.recargarDashboard();
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

  async recargarDashboard(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    this.warnings = [];
    this.esVistaPersonal = !this._authService.isAdmin;
    this.nombreEmpleadoActual = '';
    this.empleadoActualId = null;

    try {
      const solicitudes = await this._safeCall(
        'solicitudes',
        () => this._cotizacionesService.obtenerSolicitudesCotizacion(),
        [] as ISolicitudCotizacionListado[]
      );
      const listaSolicitudes = solicitudes ?? [];
      this._solicitudesActuales = listaSolicitudes;

      if (this._authService.isAdmin) {
        const [
          destinos,
          tiposDestino,
          empleados,
          continentes,
          idiomas,
          atracciones,
          tiposHabitacion,
          hotelesCount
        ] = await Promise.all([
          this._safeCall('destinos', () => this._destinosService.obtenerDestinosAdmin(), [] as any[]),
          this._safeCall('tipos de destino', () => this._destinosService.obtenerTiposDestinoAdmin(), [] as any[]),
          this._safeCall('empleados', async () => {
            const { data, error } = await this._empleadosService.empleados({ incluirInhabilitados: true });
            if (error) throw error;
            return data ?? [];
          }, [] as any[]),
          this._safeCall('continentes', async () => {
            const { data, error } = await this._supabase.continentes();
            if (error) throw error;
            return data ?? [];
          }, [] as any[]),
          this._safeCall('idiomas', () => this._catalogosAdmin.obtenerCatalogoAdmin('idiomas'), [] as any[]),
          this._safeCall('catalogo de atracciones', () => this._catalogosAdmin.obtenerCatalogoAdmin('atracciones'), [] as any[]),
          this._safeCall('tipos de habitacion', () => this._catalogosAdmin.obtenerCatalogoAdmin('tipos_habitacion'), [] as any[]),
          this._safeCall('hoteles', async () => {
            const { count, error } = await this._supabase
              .getClient()
              .from('hoteles')
              .select('id', { count: 'exact', head: true });

            if (error) throw error;
            return count ?? 0;
          }, 0),
        ]);

        this.totalDestinos = destinos.length;
        this.totalHoteles = hotelesCount || this._contarUnicosPorCampo(listaSolicitudes, 'hotel_nombre');
        this.totalEmpleados = empleados.length;
        this.totalContinentes = continentes.length;
        this.totalTiposDestino = tiposDestino.length;
        this.totalIdiomas = idiomas.length;
        this.totalCatalogoAtracciones = atracciones.length;
        this.totalTiposHabitacion = tiposHabitacion.length;

        this._calcularResumenSolicitudes(listaSolicitudes);
        this._calcularCoberturaOperativa(listaSolicitudes);
        this._calcularTopCotizados(listaSolicitudes);
        this._prepararGraficas(listaSolicitudes);
      } else {
        const user = await this._obtenerUsuarioActual();
        const empleadoActual = await this._obtenerEmpleadoActual(user.id);

        if (!empleadoActual) {
          throw new Error('No tienes un empleado vinculado para ver tu dashboard.');
        }

        this.nombreEmpleadoActual = empleadoActual.nombre;
        this.empleadoActualId = empleadoActual.id;

        const solicitudesFiltradas = this._filtrarSolicitudesPorEmpleado(listaSolicitudes, empleadoActual.nombre);

        this.totalSolicitudes = solicitudesFiltradas.length;
        this.totalCotizadas = 0;
        this.totalPendientes = 0;
        this.totalCanceladas = 0;
        this.totalUltimos30Dias = 0;
        this.totalOtras = 0;
        this.tasaCotizacion = 0;
        this.tasaPendientes = 0;
        this.promedioSolicitudesDia30 = 0;

        this.totalDestinos = this._contarUnicosPorCampo(solicitudesFiltradas, 'destino_nombre');
        this.totalHoteles = this._contarUnicosPorCampo(solicitudesFiltradas, 'hotel_nombre');
        this.totalEmpleados = solicitudesFiltradas.length ? this._contarUnicosPorCampo(solicitudesFiltradas, 'empleado_nombre') : 1;
        this.totalContinentes = 0;
        this.totalTiposDestino = 0;
        this.totalIdiomas = 0;
        this.totalCatalogoAtracciones = 0;
        this.totalTiposHabitacion = 0;

        this._calcularResumenSolicitudes(solicitudesFiltradas);
        this._calcularCoberturaOperativa(solicitudesFiltradas);
        this._calcularTopCotizados(solicitudesFiltradas);
        this._prepararGraficas(solicitudesFiltradas);
      }

      this.updatedAt = new Date();
    } catch (error) {
      this.errorMessage = this._authService.isAdmin
        ? 'No se pudo cargar el dashboard completo. Intenta recargar.'
        : 'No se pudo cargar tu dashboard. Intenta recargar.';
    } finally {
      this.isLoading = false;
    }
  }

  private _calcularResumenSolicitudes(solicitudes: ISolicitudCotizacionListado[]): void {
    const total = solicitudes.length;
    let cotizadas = 0;
    let pendientes = 0;
    let canceladas = 0;
    let ultimos30Dias = 0;

    const fechaReferencia = this._obtenerFechaReferencia30Dias(solicitudes);
    const fechaLimite = new Date(fechaReferencia);
    fechaLimite.setDate(fechaLimite.getDate() - 30);
    fechaLimite.setHours(0, 0, 0, 0);

    solicitudes.forEach((solicitud) => {
      const estatus = this._normalizarTexto(solicitud.estatus_nombre);
      const fechaSolicitud = this._obtenerFechaSolicitud(solicitud);

      if (estatus.includes('cotiz') || estatus.includes('confirm')) cotizadas += 1;
      else if (estatus.includes('pend')) pendientes += 1;
      else if (estatus.includes('cancel')) canceladas += 1;

      if (fechaSolicitud && fechaSolicitud >= fechaLimite) ultimos30Dias += 1;
    });

    this.totalSolicitudes = total;
    this.totalCotizadas = cotizadas;
    this.totalPendientes = pendientes;
    this.totalCanceladas = canceladas;
    this.totalUltimos30Dias = ultimos30Dias;
    this.totalOtras = Math.max(total - cotizadas - pendientes - canceladas, 0);

    this.tasaCotizacion = total > 0 ? Number(((cotizadas / total) * 100).toFixed(1)) : 0;
    this.tasaPendientes = total > 0 ? Number(((pendientes / total) * 100).toFixed(1)) : 0;
    this.promedioSolicitudesDia30 = Number((ultimos30Dias / 30).toFixed(1));
  }

  private _calcularCoberturaOperativa(solicitudes: ISolicitudCotizacionListado[]): void {
    this.destinosEnSolicitudes = this._contarUnicosPorCampo(solicitudes, 'destino_nombre');
    this.hotelesEnSolicitudes = this._contarUnicosPorCampo(solicitudes, 'hotel_nombre');
    this.empleadosConActividad = this._contarUnicosPorCampo(solicitudes, 'empleado_nombre');
  }

  private _calcularTopCotizados(solicitudes: ISolicitudCotizacionListado[]): void {
    const cotizadas = solicitudes.filter((solicitud) => {
      const estatus = this._normalizarTexto(solicitud.estatus_nombre);
      return estatus.includes('cotiz') || estatus.includes('confirm');
    });

    const base = cotizadas.length > 0 ? cotizadas : solicitudes;

    this.topHotelesCotizados = this._calcularTop(base, 'hotel_nombre');
    this.topDestinosCotizados = this._calcularTop(base, 'destino_nombre');
    this.topEmpleadosCotizados = this._calcularTop(base, 'empleado_nombre');
  }

  private _prepararGraficas(solicitudes: ISolicitudCotizacionListado[]): void {
    const conteoEstatus = this._contarPorCampo(solicitudes, 'estatus_nombre');
    const conteoTipoDestino = this._contarPorCampo(solicitudes, 'tipo_destino');
    const tendencia30 = this._serieUltimosDias(solicitudes, 30);
    this.fechasTendencia30Dias = tendencia30.fechas;

    const tooltipTheme = this.scheme === 'dark' ? 'dark' : 'light';
    const gridBorderColor = this.scheme === 'dark' ? 'rgba(241, 245, 249, 0.12)' : '#E2E8F0';

    this.chartResumen = {
      chart: {
        fontFamily: 'inherit',
        foreColor: 'inherit',
        type: 'bar',
        height: 340,
        toolbar: { show: false },
      },
      colors: ['#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#6366F1'],
      dataLabels: {
        enabled: true,
        formatter: (value: number): string => `${value}`,
      },
      grid: { borderColor: gridBorderColor },
      plotOptions: {
        bar: {
          borderRadius: 8,
          columnWidth: '45%',
        },
      },
      series: [
        {
          name: 'Solicitudes',
          data: [
            this.totalSolicitudes,
            this.totalCotizadas,
            this.totalPendientes,
            this.totalCanceladas,
            this.totalUltimos30Dias,
          ],
        },
      ],
      stroke: { show: false },
      xaxis: {
        categories: ['Totales', 'Cotizadas', 'Pendientes', 'Canceladas', 'Ultimos 30 dias'],
      },
      yaxis: { min: 0, forceNiceScale: true },
      tooltip: { theme: tooltipTheme },
    };

    this.chartDistribucion = {
      chart: {
        fontFamily: 'inherit',
        foreColor: 'inherit',
        type: 'donut',
        height: 340,
        events: {
          dataPointSelection: (_event: any, _chartContext: any, config: any) => {
            const index = Number(config?.dataPointIndex ?? -1);
            const estatus = conteoEstatus.labels?.[index];
            if (!estatus) return;
            void this._navegarASolicitudesPorEstatus(estatus);
          },
        },
      },
      colors: ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#A855F7', '#14B8A6'],
      labels: conteoEstatus.labels,
      series: conteoEstatus.series,
      legend: { position: 'bottom' },
      plotOptions: {
        pie: { donut: { size: '64%' } },
      },
      noData: { text: 'Sin datos disponibles' },
      tooltip: { theme: tooltipTheme },
    };

    this.chartTipoDestino = {
      chart: {
        fontFamily: 'inherit',
        foreColor: 'inherit',
        type: 'donut',
        height: 340,
      },
      colors: ['#2563EB', '#0891B2', '#7C3AED', '#F97316', '#16A34A'],
      labels: conteoTipoDestino.labels,
      series: conteoTipoDestino.series,
      legend: { position: 'bottom' },
      plotOptions: {
        pie: { donut: { size: '64%' } },
      },
      noData: { text: 'Sin datos disponibles' },
      tooltip: { theme: tooltipTheme },
    };

    this.chartSolicitudes30Dias = {
      chart: {
        fontFamily: 'inherit',
        foreColor: 'inherit',
        type: 'line',
        height: 340,
        toolbar: { show: false },
        zoom: { enabled: false },
        events: {
          click: (_event: unknown, _chartContext: unknown, config: any) => {
            this._navegarASolicitudesPorIndiceTendencia(config);
          },
          markerClick: (_event: unknown, _chartContext: unknown, config: any) => {
            this._navegarASolicitudesPorIndiceTendencia(config);
          },
          dataPointSelection: (_event: unknown, _chartContext: unknown, config: any) => {
            this._navegarASolicitudesPorIndiceTendencia(config);
          },
        },
      },
      colors: ['#0EA5E9'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 3 },
      markers: {
        size: 5,
        strokeWidth: 2,
        hover: { size: 7, sizeOffset: 2 },
      },
      grid: { borderColor: gridBorderColor },
      series: [
        {
          name: 'Solicitudes',
          data: tendencia30.series,
        },
      ],
      xaxis: {
        categories: tendencia30.labels,
      },
      yaxis: { min: 0, forceNiceScale: true },
      tooltip: {
        theme: tooltipTheme,
        intersect: true,
        shared: false,
      },
    };

    this.chartTopHoteles = this._crearGraficaTop('Hoteles', this.topHotelesCotizados, '#10B981');
    this.chartTopDestinos = this._crearGraficaTop('Destinos', this.topDestinosCotizados, '#3B82F6');
    this.chartTopEmpleados = this._crearGraficaTop('Empleados', this.topEmpleadosCotizados, '#8B5CF6');
  }

  private _crearGraficaTop(nombreSerie: string, items: RankingItem[], color: string): ApexOptions {
    const tooltipTheme = this.scheme === 'dark' ? 'dark' : 'light';
    const gridBorderColor = this.scheme === 'dark' ? 'rgba(241, 245, 249, 0.12)' : '#E2E8F0';

    return {
      chart: {
        fontFamily: 'inherit',
        foreColor: 'inherit',
        type: 'bar',
        height: 340,
        toolbar: { show: false },
      },
      colors: [color],
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
          barHeight: '65%',
        },
      },
      dataLabels: { enabled: false },
      series: [
        {
          name: nombreSerie,
          data: items.map((x) => x.total),
        },
      ],
      xaxis: {
        categories: items.map((x) => x.nombre),
      },
      yaxis: { labels: { maxWidth: 220 } },
      grid: { borderColor: gridBorderColor },
      tooltip: { theme: tooltipTheme },
      noData: { text: 'Sin datos disponibles' },
    };
  }

  private _resolveScheme(scheme: Scheme): 'light' | 'dark' {
    if (scheme !== 'auto') {
      return scheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private _contarPorCampo(
    solicitudes: ISolicitudCotizacionListado[],
    key: 'estatus_nombre' | 'tipo_destino'
  ): { labels: string[]; series: number[] } {
    const mapa = new Map<string, number>();

    solicitudes.forEach((solicitud) => {
      const valor = (solicitud[key] ?? '').toString().trim() || 'Sin dato';
      mapa.set(valor, (mapa.get(valor) ?? 0) + 1);
    });

    const ordenado = [...mapa.entries()].sort((a, b) => b[1] - a[1]);

    return {
      labels: ordenado.map(([label]) => label),
      series: ordenado.map(([, total]) => total),
    };
  }

  private _calcularTop(
    solicitudes: ISolicitudCotizacionListado[],
    key: 'hotel_nombre' | 'destino_nombre' | 'empleado_nombre'
  ): RankingItem[] {
    const mapa = new Map<string, number>();

    solicitudes.forEach((solicitud) => {
      const nombre = (solicitud[key] ?? '').toString().trim();
      if (!nombre) return;
      mapa.set(nombre, (mapa.get(nombre) ?? 0) + 1);
    });

    return [...mapa.entries()]
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }

  private _contarUnicosPorCampo(
    solicitudes: ISolicitudCotizacionListado[],
    key: 'hotel_nombre' | 'destino_nombre' | 'empleado_nombre'
  ): number {
    return new Set(
      solicitudes
        .map((solicitud) => (solicitud[key] ?? '').toString().trim())
        .filter((valor) => valor.length > 0)
    ).size;
  }

  private _serieUltimosDias(
    solicitudes: ISolicitudCotizacionListado[],
    dias: number
  ): SerieUltimosDias {
    const hoy = this._obtenerFechaReferencia30Dias(solicitudes);
    hoy.setHours(0, 0, 0, 0);

    const inicio = new Date(hoy);
    inicio.setDate(inicio.getDate() - (dias - 1));

    const labels: string[] = [];
    const series: number[] = [];
    const fechas: string[] = [];
    const conteo = new Map<string, number>();

    solicitudes.forEach((solicitud) => {
      const fecha = this._obtenerFechaSolicitud(solicitud);
      if (!fecha) return;

      const limpia = new Date(fecha);
      limpia.setHours(0, 0, 0, 0);

      if (limpia < inicio || limpia > hoy) return;

      const key = this._keyDate(limpia);
      conteo.set(key, (conteo.get(key) ?? 0) + 1);
    });

    for (let i = 0; i < dias; i += 1) {
      const dia = new Date(inicio);
      dia.setDate(inicio.getDate() + i);

      const key = this._keyDate(dia);
      labels.push(this._labelDate(dia));
      fechas.push(key);
      series.push(conteo.get(key) ?? 0);
    }

    return { labels, series, fechas };
  }

  private _keyDate(fecha: Date): string {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
  }

  private _labelDate(fecha: Date): string {
    return `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}`;
  }

  private _normalizarTexto(texto: string | null | undefined): string {
    return (texto ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private _filtrarSolicitudesPorEmpleado(
    solicitudes: ISolicitudCotizacionListado[],
    nombreEmpleado: string
  ): ISolicitudCotizacionListado[] {
    const objetivo = this._normalizarTexto(nombreEmpleado);

    if (!objetivo) {
      return [];
    }

    return solicitudes.filter((solicitud) => this._normalizarTexto(solicitud.empleado_nombre) === objetivo);
  }

  private async _obtenerUsuarioActual(): Promise<{ id: string; email: string | null }> {
    const { data, error } = await this._supabase.getClient().auth.getUser();

    if (error) throw error;
    if (!data?.user?.id) {
      throw new Error('No se pudo identificar al usuario autenticado.');
    }

    return {
      id: data.user.id,
      email: data.user.email ?? null,
    };
  }

  private async _obtenerEmpleadoActual(userId: string): Promise<{ id: number; nombre: string } | null> {
    const { data, error } = await this._supabase
      .getClient()
      .from('empleados')
      .select('id, nombre')
      .eq('auth_user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data?.id || !data?.nombre) {
      return null;
    }

    return {
      id: Number(data.id),
      nombre: String(data.nombre),
    };
  }

  private _parseFecha(fecha: string | Date | null | undefined): Date | null {
    if (!fecha) return null;
    const parsed = fecha instanceof Date ? fecha : new Date(this._normalizarTimestamp(fecha));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private _normalizarTimestamp(fecha: string): string {
    const valor = fecha.trim();
    const pgTimestamp = valor.match(
      /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?([+-]\d{2})(?::?(\d{2}))?$/
    );

    if (!pgTimestamp) {
      return valor;
    }

    const [, fechaParte, horaParte, fraccion = '000', offsetHora, offsetMinuto = '00'] = pgTimestamp;
    const milisegundos = fraccion.padEnd(3, '0').slice(0, 3);
    const offset = `${offsetHora}:${offsetMinuto}`;
    return `${fechaParte}T${horaParte}.${milisegundos}${offset}`;
  }

  private _obtenerFechaSolicitud(solicitud: ISolicitudCotizacionListado): Date | null {
    const fecha =
      solicitud.fecha_creacion ??
      (solicitud as any).created_at ??
      (solicitud as any).createdAt ??
      null;

    return this._parseFecha(fecha);
  }

  private _obtenerFechaReferencia30Dias(solicitudes: ISolicitudCotizacionListado[]): Date {
    const fechas = solicitudes
      .map((solicitud) => this._obtenerFechaSolicitud(solicitud))
      .filter((fecha): fecha is Date => !!fecha);

    if (!fechas.length) {
      return new Date();
    }

    return fechas.reduce((maxima, fechaActual) => (fechaActual > maxima ? fechaActual : maxima));
  }

  private async _safeCall<T>(
    label: string,
    task: () => Promise<T>,
    fallback: T
  ): Promise<T> {
    try {
      return await task();
    } catch (error) {
      this.warnings.push(`No se pudo cargar ${label}`);
      return fallback;
    }
  }

  private async _navegarASolicitudesPorEstatus(estatus: string): Promise<void> {
    await this._router.navigate(['/admin/cotizaciones/solicitudes'], {
      queryParams: { estatus }
    });
  }

  private async _navegarASolicitudesPorFecha(fecha: string): Promise<void> {
    await this._router.navigate(['/admin/cotizaciones/solicitudes'], {
      queryParams: { fecha }
    });
  }

  private async _navegarASolicitudesPorIndiceTendencia(config: any): Promise<void> {
    const index = Number(config?.dataPointIndex ?? -1);
    if (!Number.isInteger(index) || index < 0) return;

    const fecha = this.fechasTendencia30Dias[index];
    if (!fecha) return;

    await this._navegarASolicitudesPorFecha(fecha);
  }
}
