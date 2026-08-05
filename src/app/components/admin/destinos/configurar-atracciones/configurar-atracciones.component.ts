import { Component, inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MaterialModule } from 'app/shared/material.module';
import { DestinosService } from 'app/core/destinos.service';
import { ActividadesService } from 'app/core/actividades.service';
import { TraduccionesService } from 'app/core/traducciones.service';

interface DestinoSeleccionado {
  id: number;
  nombre: string;
}

interface AtraccionConfigurable {
  id: number;
  actividadId: number | null;
  tipo: string;
  nombre: string;
  descripcion: string;
  abierta: boolean;
  traducciones: Record<number, { nombre: string; descripcion: string }>;
  traduciendo: boolean;
  llaveTraducida: string;
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
  private readonly traduccionesService = inject(TraduccionesService);
  private readonly temporizadoresTraduccion = new Map<string, ReturnType<typeof setTimeout>>();

  cargando = true;
  guardando = false;
  error = '';
  mensajeExito = '';
  indiceDestinoActivo = 0;
  destinos: DestinoSeleccionado[] = [];
  atraccionesPorDestino: Record<number, AtraccionConfigurable[]> = {};
  idiomas: Array<{ id: number; codigo: string }> = [];

  get atracciones(): AtraccionConfigurable[] {
    return this.destinoActivo ? this.atraccionesPorDestino[this.destinoActivo.id] ?? [] : [];
  }

  get destinoActivo(): DestinoSeleccionado | undefined {
    return this.destinos[this.indiceDestinoActivo];
  }

  get destinoCompleto(): boolean {
    return this.atracciones.length > 0 && this.atracciones.every((atraccion) =>
      atraccion.nombre.trim().length > 0 && atraccion.descripcion.trim().length > 0
    );
  }

  async ngOnInit(): Promise<void> {
    const destinosIds = this.idsDesdeParametro('destinos');
    const atraccionesIds = this.idsDesdeParametro('tipos');

    if (!destinosIds.length || !atraccionesIds.length) {
      this.cargando = false;
      return;
    }

    try {
      const [destinos, catalogoAtracciones, idiomas] = await Promise.all([
        this.destinosService.buscarDestinosCatalogo({ tipo: 'NACIONAL', pageSize: 100 }),
        this.destinosService.obtenerCatalogoAtraccionesActivas(),
        this.destinosService.obtenerIdiomasPreviewAdmin()
      ]);
      this.idiomas = idiomas.map((idioma) => ({ id: idioma.id, codigo: idioma.codigo }));
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
          nombre: '',
          descripcion: '',
          abierta: index === 0,
          traducciones: {},
          traduciendo: false,
          llaveTraducida: ''
        }));
      this.atraccionesPorDestino = Object.fromEntries(
        this.destinos.map((destino) => [
          destino.id,
          atraccionesSeleccionadas.map((atraccion) => ({ ...atraccion }))
        ])
      );
    } catch (error: any) {
      this.error = error?.message ?? 'Intenta nuevamente.';
    } finally {
      this.cargando = false;
    }
  }

  alternarAtraccion(id: number): void {
    this.actualizarAtracciones((atracciones) => atracciones.map((item) => ({ ...item, abierta: item.id === id ? !item.abierta : false })));
  }

  quitarAtraccion(id: number): void {
    this.actualizarAtracciones((atracciones) => atracciones.filter((item) => item.id !== id));
  }

  programarTraduccion(atraccion: AtraccionConfigurable): void {
    const destinoId = this.destinoActivo?.id;
    if (!destinoId) return;
    const llave = `${destinoId}-${atraccion.id}`;
    const temporizadorExistente = this.temporizadoresTraduccion.get(llave);
    if (temporizadorExistente) clearTimeout(temporizadorExistente);

    if (!atraccion.nombre.trim() || !atraccion.descripcion.trim()) return;

    this.temporizadoresTraduccion.set(llave, setTimeout(() => {
      this.traducirAtraccion(destinoId, atraccion);
    }, 700));
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

  private async traducirAtraccion(destinoId: number, atraccion: AtraccionConfigurable): Promise<void> {
    if (!atraccion.nombre.trim() || !atraccion.descripcion.trim()) return;

    const llaveContenido = `${atraccion.nombre.trim()}|${atraccion.descripcion.trim()}`;
    const idiomaEspanol = this.idiomas.find((idioma) => idioma.codigo === 'es');
    if (idiomaEspanol) {
      atraccion.traducciones[idiomaEspanol.id] = {
        nombre: atraccion.nombre.trim(),
        descripcion: atraccion.descripcion.trim()
      };
    }
    if (atraccion.llaveTraducida === llaveContenido || atraccion.traduciendo) return;

    atraccion.traduciendo = true;
    try {
      const respuesta = await this.traduccionesService.traducirDesdeEspanol({
        title: atraccion.nombre.trim(),
        description: atraccion.descripcion.trim()
      });
      if (this.llaveContenido(atraccion) !== llaveContenido) return;

      atraccion.traducciones = this.idiomas.reduce((traducciones, idioma) => {
        const traduccion = respuesta?.[idioma.codigo];
        traducciones[idioma.id] = idioma.codigo === 'es'
          ? { nombre: atraccion.nombre.trim(), descripcion: atraccion.descripcion.trim() }
          : {
              nombre: typeof traduccion?.title === 'string' ? traduccion.title : '',
              descripcion: typeof traduccion?.description === 'string' ? traduccion.description : ''
            };
        return traducciones;
      }, {} as Record<number, { nombre: string; descripcion: string }>);
      atraccion.llaveTraducida = llaveContenido;
    } catch {
      // A translation failure must not interrupt the administrator's capture flow.
    } finally {
      atraccion.traduciendo = false;
    }
  }

  private async guardarConfiguracion(): Promise<void> {
    if (this.guardando || !this.destinos.every((destino) => this.atraccionesPorDestino[destino.id]?.every((atraccion) => atraccion.nombre.trim() && atraccion.descripcion.trim()))) return;

    this.guardando = true;
    this.error = '';
    try {
      for (const destino of this.destinos) {
        for (const atraccion of this.atraccionesPorDestino[destino.id] ?? []) {
          await this.traducirAtraccion(destino.id, atraccion);
          const guardada = await this.actividadesService.guardarActividadDestinoAdmin({
            catalogo_destino_id: destino.id,
            actividad_id: atraccion.actividadId,
            catalogo_atraccion_id: atraccion.id,
            imagen_fondo: null,
            traducciones: this.idiomas.map((idioma) => ({
              idioma_id: idioma.id,
              nombre: atraccion.traducciones[idioma.id]?.nombre ?? null,
              descripcion: atraccion.traducciones[idioma.id]?.descripcion ?? null
            }))
          });
          atraccion.actividadId = guardada.id;
        }
      }
      this.mensajeExito = 'Atracciones y traducciones guardadas correctamente.';
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron guardar las atracciones.';
    } finally {
      this.guardando = false;
    }
  }

  private llaveContenido(atraccion: AtraccionConfigurable): string {
    return `${atraccion.nombre.trim()}|${atraccion.descripcion.trim()}`;
  }
}
