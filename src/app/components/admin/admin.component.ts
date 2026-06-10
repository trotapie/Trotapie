import { Component, OnInit, inject } from '@angular/core';
import { ApexOptions } from 'apexcharts';
import { Router } from '@angular/router';
import { CatalogosAdminService } from 'app/core/catalogos-admin.service';
import { SupabaseService } from 'app/core/supabase.service';
import { ISolicitudCotizacionListado } from 'app/interface/solicitudes-cotizacion.interface';
import { MaterialModule } from 'app/shared/material.module';

type RankingItem = { nombre: string; total: number };
type SerieUltimosDias = { labels: string[]; series: number[]; fechas: string[] };

@Component({
  selector: 'app-admin',
  imports: [MaterialModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  private _supabase = inject(SupabaseService);
  private _catalogosAdmin = inject(CatalogosAdminService);
  private _router = inject(Router);

  isLoading = false;
  errorMessage = '';
  updatedAt: Date | null = null;
  warnings: string[] = [];

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

  ngOnInit(): void {
    void this.recargarDashboard();
  }

  async recargarDashboard(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    this.warnings = [];

    try {
      const [
        solicitudes,
        destinos,
        tiposDestino,
        empleados,
        continentes,
        idiomas,
        atracciones,
        tiposHabitacion,
        hotelesCount
      ] = await Promise.all([
        this._safeCall('solicitudes', () => this._supabase.obtenerSolicitudesCotizacion(), [] as ISolicitudCotizacionListado[]),
        this._safeCall('destinos', () => this._supabase.obtenerDestinosAdmin(), [] as any[]),
        this._safeCall('tipos de destino', () => this._supabase.obtenerTiposDestinoAdmin(), [] as any[]),
        this._safeCall('empleados', async () => {
          const { data, error } = await this._supabase.empleados({ incluirInhabilitados: true });
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

      const listaSolicitudes = solicitudes ?? [];

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

      this.updatedAt = new Date();
    } catch (error) {
      this.errorMessage = 'No se pudo cargar el dashboard completo. Intenta recargar.';
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
      grid: { borderColor: '#E2E8F0' },
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
      tooltip: { theme: 'light' },
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
      tooltip: { theme: 'light' },
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
      tooltip: { theme: 'light' },
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
      grid: { borderColor: '#E2E8F0' },
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
        theme: 'light',
        intersect: true,
        shared: false,
      },
    };

    this.chartTopHoteles = this._crearGraficaTop('Hoteles', this.topHotelesCotizados, '#10B981');
    this.chartTopDestinos = this._crearGraficaTop('Destinos', this.topDestinosCotizados, '#3B82F6');
    this.chartTopEmpleados = this._crearGraficaTop('Empleados', this.topEmpleadosCotizados, '#8B5CF6');
  }

  private _crearGraficaTop(nombreSerie: string, items: RankingItem[], color: string): ApexOptions {
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
      grid: { borderColor: '#E2E8F0' },
      tooltip: { theme: 'light' },
      noData: { text: 'Sin datos disponibles' },
    };
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
    await this._router.navigate(['/admin/solicitudes-cotizacion'], {
      queryParams: { estatus }
    });
  }

  private async _navegarASolicitudesPorFecha(fecha: string): Promise<void> {
    await this._router.navigate(['/admin/solicitudes-cotizacion'], {
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
