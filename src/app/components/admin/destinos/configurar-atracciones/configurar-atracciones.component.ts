import { Component, inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MaterialModule } from 'app/shared/material.module';
import { DestinosService } from 'app/core/destinos.service';
import { ActividadesService } from 'app/core/actividades.service';

interface DestinoSeleccionado {
  id: number;
  nombre: string;
}

interface AtraccionConfigurable {
  id: number;
  actividadId: number | null;
  tipo: string;
}

@Component({
  selector: 'app-configurar-atracciones',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './configurar-atracciones.component.html',
  styleUrl: './configurar-atracciones.component.css'
})
export class ConfigurarAtraccionesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destinosService = inject(DestinosService);
  private readonly actividadesService = inject(ActividadesService);

  cargando = true;
  guardando = false;
  error = '';
  mensajeExito = '';
  indiceDestinoActivo = 0;
  destinos: DestinoSeleccionado[] = [];
  atraccionesPorDestino: Record<number, AtraccionConfigurable[]> = {};

  get atracciones(): AtraccionConfigurable[] {
    return this.destinoActivo ? this.atraccionesPorDestino[this.destinoActivo.id] ?? [] : [];
  }

  get destinoActivo(): DestinoSeleccionado | undefined {
    return this.destinos[this.indiceDestinoActivo];
  }

  get destinoCompleto(): boolean {
    return true;
  }

  async ngOnInit(): Promise<void> {
    const destinosIds = this.idsDesdeParametro('destinos');
    const atraccionesIds = this.idsDesdeParametro('tipos');

    if (!destinosIds.length || !atraccionesIds.length) {
      this.cargando = false;
      return;
    }

    try {
      const [destinos, catalogoAtracciones] = await Promise.all([
        this.destinosService.buscarDestinosCatalogo({ tipo: 'NACIONAL', pageSize: 100 }),
        this.destinosService.obtenerCatalogoAtraccionesActivas()
      ]);
      const destinosPorId = new Map(destinos.items.map((destino: any) => [Number(destino.destinoId), { id: destino.destinoId, nombre: destino.destinoNombre }]));
      const atraccionesPorId = new Map(catalogoAtracciones.map((atraccion) => [atraccion.id, atraccion]));

      this.destinos = destinosIds
        .map((id) => destinosPorId.get(id))
        .filter(Boolean)
        .map((destino: any) => ({ id: Number(destino.id), nombre: destino.nombre }));
      const atraccionesSeleccionadas = atraccionesIds
        .map((id) => atraccionesPorId.get(id))
        .filter(Boolean)
        .map((atraccion, index) => ({
          id: atraccion!.id,
          actividadId: null,
          tipo: atraccion!.nombre,
        }));
      const previews = await Promise.all(this.destinos.map((destino) => this.destinosService.obtenerPreviewDestinoAdmin(destino.id)));
      this.atraccionesPorDestino = Object.fromEntries(this.destinos.map((destino, index) => {
        const tiposRegistrados = new Set((previews[index].actividades ?? [])
          .map((actividad) => actividad.catalogo_atraccion_id)
          .filter((id): id is number => id !== null && id !== undefined));
        return [destino.id, atraccionesSeleccionadas
          .filter((atraccion) => !tiposRegistrados.has(atraccion.id))
          .map((atraccion) => ({ ...atraccion }))];
      }));
    } catch (error: any) {
      this.error = error?.message ?? 'Intenta nuevamente.';
    } finally {
      this.cargando = false;
    }
  }

  quitarAtraccion(id: number): void {
    this.actualizarAtracciones((atracciones) => atracciones.filter((item) => item.id !== id));
  }

  regresarPaso(): void {
    if (this.indiceDestinoActivo) this.indiceDestinoActivo--;
  }

  siguiente(): void {
    if (!this.destinoCompleto) return;
    if (this.indiceDestinoActivo < this.destinos.length - 1) { this.indiceDestinoActivo++; return; }
    this.guardarConfiguracion();
  }

  volver(): void { this.router.navigate(['/admin/destinos/configurar-destinos']); }

  private idsDesdeParametro(nombre: string): number[] {
    return (this.route.snapshot.queryParamMap.get(nombre) ?? '').split(',')
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0);
  }

  private actualizarAtracciones(actualizar: (atracciones: AtraccionConfigurable[]) => AtraccionConfigurable[]): void {
    if (!this.destinoActivo) return;
    this.atraccionesPorDestino = {
      ...this.atraccionesPorDestino,
      [this.destinoActivo.id]: actualizar(this.atracciones)
    };
  }

  private async guardarConfiguracion(): Promise<void> {
    if (this.guardando) return;

    this.guardando = true;
    this.error = '';
    try {
      for (const destino of this.destinos) {
        for (const atraccion of this.atraccionesPorDestino[destino.id] ?? []) {
          const guardada = await this.actividadesService.guardarActividadDestinoAdmin({
            catalogo_destino_id: destino.id,
            actividad_id: atraccion.actividadId,
            catalogo_atraccion_id: atraccion.id,
            imagen_fondo: null,
            traducciones: []
          });
          atraccion.actividadId = guardada.id;
        }
      }
      this.mensajeExito = 'Tipos de actividad guardados correctamente.';
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron guardar las atracciones.';
    } finally {
      this.guardando = false;
    }
  }

}
