import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MaterialModule } from 'app/shared/material.module';
import { CircuitosService } from 'app/core/circuitos.service';
import { Circuito } from 'app/shared/flyer-editor/models/circuito.interface';

@Component({
  selector: 'app-circuitos',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './circuitos.component.html',
})
export class CircuitosComponent implements OnInit {
  private circuitosService = inject(CircuitosService);
  private router = inject(Router);

  circuitos: Circuito[] = [];
  cargando = true;
  error = '';

  async ngOnInit() {
    try {
      this.circuitos = await this.circuitosService.listCircuitosPublicos('es');
    } catch (err: any) {
      this.error = err?.message ?? 'No se pudieron cargar los circuitos.';
    } finally {
      this.cargando = false;
    }
  }

  irADetalle(circuito: Circuito) {
    const nombreSlug = (circuito.nombre ?? '').toLowerCase().replace(/\s+/g, '-');
    this.router.navigate(['/circuitos', circuito.id, nombreSlug]);
  }
}
