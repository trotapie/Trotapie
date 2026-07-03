import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MaterialModule } from 'app/shared/material.module';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { DestinosService } from 'app/core/destinos.service';

@Component({
  selector: 'app-destinos',
  standalone: true,
  imports: [
    MaterialModule,
    DragDropModule,
    RouterLink
  ],
  templateUrl: './destinos.component.html',
  styleUrl: './destinos.component.scss'
})
export class DestinosComponent implements OnInit {
  private supabase = inject(DestinosService);
  private router = inject(Router);

  displayedColumns = ['orden', 'destino', 'tipoDestino', 'activo', 'acciones'];

  tipoVisible: 'NACIONAL' | 'INTERNACIONAL' = 'NACIONAL';
  destinosNacionales: any[] = [];
  destinosInternacionales: any[] = [];
  continentes: Array<{ id: number; nombre: string }> = [];
  filtroContinenteId: number | null = null;
  filtroPais: string | null = null;
  filtroBusqueda = '';
  ordenOriginalNacionalesIds: number[] = [];
  ordenOriginalInternacionalesIds: number[] = [];
  hayCambiosOrden = false;
  actualizandoOrden = false;
  errorOrden = '';
  mostrarModalOrdenExito = false;

  async ngOnInit() {
    const [informacionDestino, destinosAdmin, continentesResponse] = await Promise.all([
      this.supabase.consultarDestinos(),
      this.supabase.obtenerDestinosAdmin(),
      this.supabase.continentes()
    ]);
    const destinos = informacionDestino ?? [];
    const catalogoDestinos = destinosAdmin ?? [];
    this.continentes = continentesResponse?.data ?? [];

    this.destinosNacionales = destinos.filter((item) => this.esNacional(item));
    this.destinosInternacionales = this.enriquecerInternacionales(
      destinos.filter((item) => !this.esNacional(item)),
      catalogoDestinos
    );

    this.ordenOriginalNacionalesIds = this.destinosNacionales.map((item) => item.id);
    this.ordenOriginalInternacionalesIds = this.destinosInternacionales.map((item) => item.id);
    this.actualizarEstadoCambiosOrden();
  }

  get dataSourceVisible(): any[] {
    if (this.tipoVisible === 'NACIONAL') {
      return this.destinosNacionales;
    }

    return this.destinosInternacionales.filter((item) => {
      const pasaContinente = this.filtroContinenteId ? item.continente_id === this.filtroContinenteId : true;
      const pasaPais = this.filtroPais ? item.pais_nombre === this.filtroPais : true;
      return pasaContinente && pasaPais;
    });
  }

  get dataSourceFiltrada(): any[] {
    const lista = this.dataSourceVisible;
    if (!this.filtroBusqueda.trim()) {
      return lista;
    }

    const termino = this.filtroBusqueda.trim().toLowerCase();
    return lista.filter((item) => {
      const nombre = String(item.destino ?? item.nombre ?? '').toLowerCase();
      const destinoPadre = String(item.destino_padre ?? '').toLowerCase();
      return nombre.includes(termino) || destinoPadre.includes(termino);
    });
  }

  get paisesDisponibles(): string[] {
    const filtrados = this.destinosInternacionales.filter((item) =>
      this.filtroContinenteId ? item.continente_id === this.filtroContinenteId : true
    );

    return [...new Set(filtrados.map((item) => item.pais_nombre).filter(Boolean))].sort((a, b) =>
      String(a).localeCompare(String(b))
    );
  }

  seleccionarTipo(tipo: 'NACIONAL' | 'INTERNACIONAL') {
    this.tipoVisible = tipo;
    this.filtroContinenteId = null;
    this.filtroPais = null;
    this.actualizarEstadoCambiosOrden();
    this.errorOrden = '';
  }

  seleccionarContinente(continenteId: number | null) {
    this.filtroContinenteId = continenteId;
    this.filtroPais = null;
  }

  seleccionarPais(pais: string | null) {
    this.filtroPais = pais;
  }

  get draggableEnabled(): boolean {
    return !this.filtroBusqueda.trim();
  }

  drop(event: CdkDragDrop<any[]>) {
    const lista = this.dataSourceVisible;
    moveItemInArray(lista, event.previousIndex, event.currentIndex);

    if (this.tipoVisible === 'NACIONAL') {
      this.destinosNacionales = [...lista];
    } else {
      this.destinosInternacionales = [...lista];
    }

    this.actualizarEstadoCambiosOrden();
    this.errorOrden = '';
  }

  async actualizarOrden() {
    if (!this.hayCambiosOrden || this.actualizandoOrden) {
      return;
    }

    this.actualizandoOrden = true;
    this.errorOrden = '';
    this.mostrarModalOrdenExito = false;

    try {
      const payload = this.dataSourceVisible.map((item, index) => ({
        id: Number(item.id),
        orden: index + 1
      }));

      await this.supabase.actualizarOrdenDestinos(payload);

      if (this.tipoVisible === 'NACIONAL') {
        this.ordenOriginalNacionalesIds = this.destinosNacionales.map((item) => item.id);
      } else {
        this.ordenOriginalInternacionalesIds = this.destinosInternacionales.map((item) => item.id);
      }

      this.actualizarEstadoCambiosOrden();
      this.mostrarModalOrdenExito = true;
    } catch (error: any) {
      this.errorOrden = error?.message ?? 'No se pudo actualizar el orden de destinos.';
    } finally {
      this.actualizandoOrden = false;
    }
  }

  cerrarModalOrdenExito() {
    this.mostrarModalOrdenExito = false;
  }

  async verHoteles(item: any) {
    const esNacional = this.esNacional(item);

    if (esNacional) {
      await this.router.navigate(['/admin/hoteles'], {
        queryParams: {
          tipo: 'NACIONAL',
          destinoId: item.id
        }
      });
      return;
    }

    const destino = await this.supabase.obtenerDestinoPorId(Number(item.id));
    if (!destino) {
      return;
    }

    const paisId = destino.destino_padre_id ?? destino.id;
    let continenteId = destino.continente_id ?? null;

    if (!continenteId && destino.destino_padre_id) {
      const pais = await this.supabase.obtenerDestinoPorId(Number(destino.destino_padre_id));
      continenteId = pais?.continente_id ?? null;
    }

    await this.router.navigate(['/admin/hoteles'], {
      queryParams: {
        tipo: 'INTERNACIONAL',
        continenteId: continenteId ?? undefined,
        paisId,
        destinoId: destino.id
      }
    });
  }

  private actualizarEstadoCambiosOrden() {
    this.hayCambiosOrden = this.tipoVisible === 'NACIONAL'
      ? !this.tieneMismoOrden(this.destinosNacionales, this.ordenOriginalNacionalesIds)
      : !this.tieneMismoOrden(this.destinosInternacionales, this.ordenOriginalInternacionalesIds);
  }

  private tieneMismoOrden(listaActual: any[], ordenOriginalIds: number[]): boolean {
    if (listaActual.length !== ordenOriginalIds.length) {
      return false;
    }

    return listaActual.every((item, index) => item.id === ordenOriginalIds[index]);
  }

  private esNacional(item: any): boolean {
    const tipo = String(item?.tipo_destino ?? '').toUpperCase().trim();
    return !tipo.includes('INTERNACIONAL') && Number(item?.tipo_desino_id ?? 1) !== 2;
  }

  private enriquecerInternacionales(destinosInternacionales: any[], catalogoDestinos: any[]) {
    const mapaPorId = new Map<number, any>();
    catalogoDestinos.forEach((d: any) => mapaPorId.set(Number(d.id), d));

    return destinosInternacionales.map((item) => {
      const actual = mapaPorId.get(Number(item.id));
      const esPais = !actual?.destino_padre_id;
      const pais = esPais ? actual : mapaPorId.get(Number(actual?.destino_padre_id));

      return {
        ...item,
        continente_id: pais?.continente_id ?? null,
        pais_nombre: pais?.nombre ?? item.destino_padre ?? item.destino
      };
    });
  }
}
