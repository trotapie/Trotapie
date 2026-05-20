import { AfterViewInit, Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FuseSplashScreenService } from '@fuse/services/splash-screen';
import { SupabaseService } from 'app/core/supabase.service';
import { ISolicitudCotizacionListado } from 'app/interface/solicitudes-cotizacion.interface';
import { EstatusComponent } from 'app/shared/estatus/estatus.component';
import { MaterialModule } from 'app/shared/material.module';

type ColumnFilterKey =
  | 'id'
  | 'cliente'
  | 'hotel'
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
  private supabase = inject(SupabaseService);
  private route = inject(ActivatedRoute);

  displayedColumns: string[] = [
    'id',
    'cliente',
    'hotel',
    'destino',
    'tipoDestino',
    'empleado',
    'estatus',
    'acciones',
  ];

  readonly filterColumns: string[] = [
    'idFilter',
    'clienteFilter',
    'hotelFilter',
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
  columnFilters: Record<ColumnFilterKey, string> = {
    id: '',
    cliente: '',
    hotel: '',
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
      this.dataSource.data = data ?? [];
      this.estatusOptions = this.obtenerOpcionesEstatus(this.dataSource.data);

      if (this.paginator) this.dataSource.paginator = this.paginator;
      if (this.sort) this.dataSource.sort = this.sort;
    } finally {
      this.splashScreen.hide();
    }
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
        case 'cliente':
          return data.cliente_nombre ?? '';
        case 'hotel':
          return data.hotel_nombre ?? '';
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
      const clienteFilter = this.normalize(normalized.cliente ?? '');
      const hotelFilter = this.normalize(normalized.hotel ?? '');
      const destinoFilter = this.normalize(normalized.destino ?? '');
      const tipoDestinoFilter = this.normalize(normalized.tipoDestino ?? '');
      const empleadoFilter = this.normalize(normalized.empleado ?? '');
      const estatusFilter = this.normalize(normalized.estatus ?? '');

      const byColumn =
        this.normalize(data.id).includes(idFilter) &&
        this.normalize(data.cliente_nombre).includes(clienteFilter) &&
        this.normalize(data.hotel_nombre).includes(hotelFilter) &&
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
      destino: '',
      tipoDestino: '',
      empleado: '',
      estatus: '',
    };
    this.applyCombinedFilters();
  }

  toggleColumnFilters(): void {
    this.showColumnFilters = !this.showColumnFilters;
  }

  setQuickFilter(v: '' | 'pendiente' | 'confirmada' | 'cancelada'): void {
    this.quickFilter = v;
    this.applyCombinedFilters();
  }

  get hasActiveFilters(): boolean {
    return Object.values(this.columnFilters).some((value) => this.normalize(value).length > 0);
  }

  private applyCombinedFilters(): void {
    this.dataSource.filter = JSON.stringify({
      ...this.columnFilters,
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
    if (!estatus) return;

    this.quickFilter = '';
    this.showColumnFilters = true;
    this.setEstatusFilter(estatus);
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
}
