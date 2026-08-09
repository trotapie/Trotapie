import { Component, OnInit, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { DestinosService, ResumenCatalogoDestinos } from 'app/core/destinos.service';
import { MaterialModule } from 'app/shared/material.module';

@Component({
  selector: 'app-resumen-catalogo-destinos',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './resumen-catalogo-destinos.component.html',
  styleUrl: './resumen-catalogo-destinos.component.scss'
})
export class ResumenCatalogoDestinosComponent implements OnInit {
  private readonly destinosService = inject(DestinosService);
  private readonly dialogRef = inject(MatDialogRef<ResumenCatalogoDestinosComponent>);
  private readonly router = inject(Router);

  resumen: ResumenCatalogoDestinos | null = null;
  cargando = true;
  error = '';

  async ngOnInit(): Promise<void> {
    await this.cargarResumen();
  }

  async cargarResumen(): Promise<void> {
    this.cargando = true;
    this.error = '';

    try {
      this.resumen = await this.destinosService.obtenerResumenCatalogoDestinosAdmin();
    } catch (error: any) {
      this.resumen = null;
      this.error = error?.message ?? 'No se pudo cargar el resumen del catálogo.';
    } finally {
      this.cargando = false;
    }
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  irA(ruta: string): void {
    this.dialogRef.close();
    void this.router.navigateByUrl(ruta);
  }
}
