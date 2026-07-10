import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MaterialModule } from 'app/shared/material.module';
import { fadeSlideIn } from 'app/shared/animations';
import { CircuitosService } from 'app/core/circuitos.service';
import { Circuito } from 'app/shared/flyer-editor/models/circuito.interface';
import { CustomSwitchComponent } from 'app/shared/custom-switch/custom-switch.component';

@Component({
  selector: 'app-admin-circuitos',
  standalone: true,
  imports: [MaterialModule, CustomSwitchComponent],
  templateUrl: './admin-circuitos.component.html',
  styleUrl: './admin-circuitos.component.scss',
  animations: [fadeSlideIn],
})
export class AdminCircuitosComponent implements OnInit {
  private circuitosService = inject(CircuitosService);
  private router = inject(Router);

  displayedColumns = ['nombre', 'precio_total', 'duracion', 'activo', 'created_at', 'acciones'];

  circuitos: Circuito[] = [];
  cargando = true;
  error = '';
  mostrandoModalEliminar = false;
  circuitoAEliminar: Circuito | null = null;
  eliminando = false;

  async ngOnInit() {
    try {
      this.cargando = true;
      this.circuitos = await this.circuitosService.listCircuitosAdmin();
    } catch (err: any) {
      this.error = err?.message ?? 'No se pudieron cargar los circuitos.';
    } finally {
      this.cargando = false;
    }
  }

  irACreacion() {
    this.router.navigate(['/admin/circuitos/editar', 'nuevo']);
  }

  irAEdicion(circuito: Circuito) {
    this.router.navigate(['/admin/circuitos/editar', circuito.id]);
  }

  async toggleActivo(circuito: Circuito) {
    try {
      this.error = '';
      await this.circuitosService.toggleActivo(circuito.id, !circuito.activo);
      circuito.activo = !circuito.activo;
    } catch (err: any) {
      this.error = err?.message ?? 'No se pudo cambiar el estado.';
    }
  }

  abrirModalEliminar(circuito: Circuito) {
    this.circuitoAEliminar = circuito;
    this.mostrandoModalEliminar = true;
  }

  cerrarModalEliminar() {
    this.mostrandoModalEliminar = false;
    this.circuitoAEliminar = null;
  }

  async confirmarEliminar() {
    if (!this.circuitoAEliminar || this.eliminando) return;
    const id = this.circuitoAEliminar.id;
    this.eliminando = true;
    try {
      await this.circuitosService.eliminarCircuito(id);
      this.circuitos = this.circuitos.filter((c) => c.id !== id);
      this.cerrarModalEliminar();
    } catch (err: any) {
      this.error = err?.message ?? 'No se pudo eliminar el circuito.';
    } finally {
      this.eliminando = false;
    }
  }
}
