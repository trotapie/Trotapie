import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SupabaseService } from 'app/core/supabase.service';
import { MaterialModule } from 'app/shared/material.module';

interface ITipoDestino {
  id: number;
  nombre: string;
}

interface IDestinoAdmin {
  id: number;
  tipo_desino_id: number | null;
  destino_padre_id: number | null;
  continente_id: number | null;
}

interface IConcentradoTipoDestino {
  id: number;
  nombre: string;
  totalDestinos: number;
  totalPadres: number;
  totalSubdestinos: number;
  totalContinentes: number;
  participacion: number;
}

@Component({
  selector: 'app-tipo-destinos',
  standalone: true,
  imports: [MaterialModule, RouterLink],
  templateUrl: './tipo-destinos.component.html',
  styleUrl: './tipo-destinos.component.scss'
})
export class TipoDestinosComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);

  cargando = true;
  error = '';

  concentrado: IConcentradoTipoDestino[] = [];
  totalDestinos = 0;

  get totalTipos(): number {
    return this.concentrado.length;
  }

  get tiposConDestinos(): number {
    return this.concentrado.filter((item) => item.totalDestinos > 0).length;
  }

  get tiposSinDestinos(): number {
    return this.concentrado.filter((item) => item.totalDestinos === 0).length;
  }

  async ngOnInit() {
    await this.cargarConcentrado();
  }

  async cargarConcentrado() {
    this.cargando = true;
    this.error = '';

    try {
      const [tiposRaw, destinosRaw] = await Promise.all([
        this.supabase.obtenerTiposDestinoAdmin(),
        this.supabase.obtenerDestinosAdmin()
      ]);

      const tipos = (tiposRaw ?? []) as ITipoDestino[];
      const destinos = (destinosRaw ?? []) as IDestinoAdmin[];
      this.totalDestinos = destinos.length;

      this.concentrado = this.generarConcentrado(tipos, destinos);
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo cargar el concentrado de tipos de destino.';
      this.concentrado = [];
      this.totalDestinos = 0;
    } finally {
      this.cargando = false;
    }
  }

  private generarConcentrado(
    tipos: ITipoDestino[],
    destinos: IDestinoAdmin[]
  ): IConcentradoTipoDestino[] {
    const destinosPorTipo = new Map<number, IDestinoAdmin[]>();

    destinos.forEach((destino) => {
      const tipoId = Number(destino?.tipo_desino_id);
      if (!Number.isFinite(tipoId)) {
        return;
      }

      if (!destinosPorTipo.has(tipoId)) {
        destinosPorTipo.set(tipoId, []);
      }

      destinosPorTipo.get(tipoId)?.push(destino);
    });

    const filasBase = tipos.map((tipo) => {
      const lista = destinosPorTipo.get(Number(tipo.id)) ?? [];
      const padres = lista.filter((destino) => destino.destino_padre_id === null);
      const continentes = new Set(
        padres
          .map((destino) => destino.continente_id)
          .filter((id): id is number => Number.isFinite(id as number))
      );
      const totalDestinosTipo = lista.length;

      return {
        id: Number(tipo.id),
        nombre: tipo.nombre,
        totalDestinos: totalDestinosTipo,
        totalPadres: padres.length,
        totalSubdestinos: totalDestinosTipo - padres.length,
        totalContinentes: continentes.size,
        participacion: this.totalDestinos > 0 ? (totalDestinosTipo / this.totalDestinos) * 100 : 0
      };
    });

    const idsCatalogo = new Set(filasBase.map((fila) => fila.id));

    destinosPorTipo.forEach((lista, tipoId) => {
      if (idsCatalogo.has(tipoId)) {
        return;
      }

      const padres = lista.filter((destino) => destino.destino_padre_id === null);
      const continentes = new Set(
        padres
          .map((destino) => destino.continente_id)
          .filter((id): id is number => Number.isFinite(id as number))
      );
      const totalDestinosTipo = lista.length;

      filasBase.push({
        id: tipoId,
        nombre: `TIPO ${tipoId}`,
        totalDestinos: totalDestinosTipo,
        totalPadres: padres.length,
        totalSubdestinos: totalDestinosTipo - padres.length,
        totalContinentes: continentes.size,
        participacion: this.totalDestinos > 0 ? (totalDestinosTipo / this.totalDestinos) * 100 : 0
      });
    });

    return filasBase.sort((a, b) => a.id - b.id);
  }
}
