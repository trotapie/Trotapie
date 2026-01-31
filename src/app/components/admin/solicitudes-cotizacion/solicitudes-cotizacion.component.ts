import { AfterViewInit, Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { FuseSplashScreenService } from '@fuse/services/splash-screen';
import { SupabaseService } from 'app/core/supabase.service';
import { ISolicitudCotizacionListado } from 'app/interface/solicitudes-cotizacion.interface';
import { MaterialModule } from 'app/shared/material.module';

@Component({
  selector: 'app-solicitudes-cotizacion',
  imports: [MaterialModule, RouterLink],
  templateUrl: './solicitudes-cotizacion.component.html',
  styleUrl: './solicitudes-cotizacion.component.scss'
})
export class SolicitudesCotizacionComponent implements OnInit, AfterViewInit {
  private splashScreen = inject(FuseSplashScreenService);
  private supabase = inject(SupabaseService);

  // ✅ columnas reales (ajusta a tu HTML)
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

  // ✅ inicializa vacío para que no truene en AfterViewInit
  dataSource = new MatTableDataSource<ISolicitudCotizacionListado>([]);

  // ✅ quick filters por estatus (ajusta a tus nombres reales)
  quickFilter: '' | 'pendiente' | 'confirmada' | 'cancelada' = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  async ngOnInit() {
    this.splashScreen.show();

    try {
      const data = await this.supabase.obtenerSolicitudesCotizacion();
      this.dataSource.data = data ?? [];

      // Si el view ya está listo, asigna paginator/sort aquí también (por seguridad)
      if (this.paginator) this.dataSource.paginator = this.paginator;
      if (this.sort) this.dataSource.sort = this.sort;
    } finally {
      this.splashScreen.hide();
    }
  }

  ngAfterViewInit(): void {
    // ✅ aquí ya existen ViewChild
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
    // ✅ filtro “smart”: busca en varias columnas reales
    this.dataSource.filterPredicate = (
      data: ISolicitudCotizacionListado,
      filter: string
    ) => {
      const f = (filter ?? '').trim().toLowerCase();

      const base = `
        ${data.id}
        ${data.cliente_nombre ?? ''}
        ${data.cliente_email ?? ''}
        ${data.cliente_telefono ?? ''}
        ${data.hotel_nombre ?? ''}
        ${data.destino_nombre ?? ''}
        ${data.tipo_destino ?? ''}
        ${data.empleado_nombre ?? ''}
        ${data.estatus_nombre ?? ''}
      `.toLowerCase();

      // ✅ Quick filter por estatus (ajusta strings si tu DB trae otros)
      if (this.quickFilter === 'pendiente' && (data.estatus_nombre ?? '').toUpperCase() !== 'PENDIENTE') return false;
      if (this.quickFilter === 'confirmada' && (data.estatus_nombre ?? '').toUpperCase() !== 'CONFIRMADA') return false;
      if (this.quickFilter === 'cancelada' && (data.estatus_nombre ?? '').toUpperCase() !== 'CANCELADA') return false;

      return base.includes(f);
    };
  }

  applyFilter(event: Event): void {
    const value = (event.target as HTMLInputElement)?.value ?? '';
    this.dataSource.filter = value.trim().toLowerCase();
    this.dataSource.paginator?.firstPage();
  }

  clearFilter(): void {
    this.dataSource.filter = '';
    this.dataSource.paginator?.firstPage();
  }

  setQuickFilter(v: '' | 'pendiente' | 'confirmada' | 'cancelada'): void {
    this.quickFilter = v;
    // Fuerza re-evaluación del predicate
    this.dataSource.filter = (this.dataSource.filter ?? '').toString();
    this.dataSource.paginator?.firstPage();
  }


}
