import { AfterViewInit, Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { FuseSplashScreenService } from '@fuse/services/splash-screen';
import { CotizacionesService } from 'app/core/cotizaciones.service';
import { ISolicitudCotizacionListado } from 'app/interface/solicitudes-cotizacion.interface';
import { MaterialModule } from 'app/shared/material.module';
import { fadeSlideIn } from 'app/shared/animations';

@Component({
  selector: 'app-cotizaciones-multiples',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './cotizaciones-multiples.component.html',
  styleUrl: './cotizaciones-multiples.component.scss',
  animations: [fadeSlideIn]
})
export class CotizacionesMultiplesComponent implements OnInit, AfterViewInit {
  private splashScreen = inject(FuseSplashScreenService);
  private supabase = inject(CotizacionesService);
  private router = inject(Router);

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

  dataSource = new MatTableDataSource<ISolicitudCotizacionListado>([]);
  cargando = true;
  error = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  async ngOnInit() {
      this.splashScreen.show();
    try {
      this.cargando = true;
      const data = await this.supabase.obtenerCotizacionesMultiples();
      this.dataSource.data = (data ?? []).filter((row) => Boolean(String(row.hotel_nombre ?? '').trim()));
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo cargar el concentrado de cotizaciones multiples.';
    } finally {
      this.cargando = false;
      this.splashScreen.hide();
    }
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  editarCotizacion(publicId?: string): void {
    if (!publicId) return;
    void this.router.navigate(['/admin/edicion-cotizacion', publicId]);
  }

  crearNueva(): void {
    void this.router.navigate(['/admin/cotizaciones-multiples/nueva']);
  }
}
