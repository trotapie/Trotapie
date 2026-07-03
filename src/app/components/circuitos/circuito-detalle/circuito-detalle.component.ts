import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MaterialModule } from 'app/shared/material.module';
import { CircuitosService } from 'app/core/circuitos.service';
import { Circuito } from 'app/shared/flyer-editor/models/circuito.interface';

@Component({
  selector: 'app-circuito-detalle',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './circuito-detalle.component.html',
})
export class CircuitoDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private circuitosService = inject(CircuitosService);

  circuito: Circuito | null = null;
  cargando = true;
  error = '';

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id)) {
      this.error = 'Circuito no encontrado.';
      this.cargando = false;
      return;
    }

    try {
      this.circuito = await this.circuitosService.infoCircuito(id, 'es');
      if (!this.circuito) throw new Error('No encontrado');
    } catch (err: any) {
      this.error = err?.message ?? 'No se pudo cargar el circuito.';
    } finally {
      this.cargando = false;
    }
  }

  regresar() {
    this.router.navigate(['/circuitos']);
  }
}
