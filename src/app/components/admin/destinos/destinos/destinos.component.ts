import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MaterialModule } from 'app/shared/material.module';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { DestinosService } from 'app/core/destinos.service';
import { EstatusComponent } from 'app/shared/estatus/estatus.component';
import { PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-destinos',
  standalone: true,
  imports: [
    MaterialModule,
    DragDropModule,
    RouterLink,
    EstatusComponent
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
  pageIndex = 0;
  pageSize = 10;
  pageSizeOptions = [10, 25, 50];
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
    const catalogoDestinos = destinosAdmin ?? [];
    const estadosPorDestinoId = new Map(
      catalogoDestinos.map((item: any) => [Number(item.id), Boolean(item.activo)])
    );
    const destinos = (informacionDestino ?? []).map((item: any) => ({
      ...item,
      activo: estadosPorDestinoId.get(Number(item.id)) ?? Boolean(item.activo)
    }));
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

  get dataSourcePaginada(): any[] {
    const inicio = this.pageIndex * this.pageSize;
    return this.dataSourceFiltrada.slice(inicio, inicio + this.pageSize);
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
    this.pageIndex = 0;
    this.actualizarEstadoCambiosOrden();
    this.errorOrden = '';
  }

  seleccionarContinente(continenteId: number | null) {
    this.filtroContinenteId = continenteId;
    this.filtroPais = null;
    this.pageIndex = 0;
  }

  seleccionarPais(pais: string | null) {
    this.filtroPais = pais;
    this.pageIndex = 0;
  }

  onBusquedaChange(valor: string) {
    this.filtroBusqueda = valor;
    this.pageIndex = 0;
  }

  get draggableEnabled(): boolean {
    return !this.filtroBusqueda.trim();
  }

  drop(event: CdkDragDrop<any[]>) {
    const inicioPagina = this.pageIndex * this.pageSize;
    const indiceOrigen = inicioPagina + event.previousIndex;
    const indiceDestino = inicioPagina + event.currentIndex;
    const listaVisible = this.dataSourceVisible;

    if (indiceOrigen === indiceDestino || indiceOrigen < 0 || indiceDestino < 0) {
      return;
    }

    if (this.tipoVisible === 'NACIONAL') {
      this.destinosNacionales = this.reordenarListaVisible(this.destinosNacionales, listaVisible, indiceOrigen, indiceDestino);
    } else {
      this.destinosInternacionales = this.reordenarListaVisible(this.destinosInternacionales, listaVisible, indiceOrigen, indiceDestino);
    }

    this.actualizarEstadoCambiosOrden();
    this.errorOrden = '';
  }

  cambiarPagina(evento: PageEvent) {
    this.pageIndex = evento.pageIndex;
    this.pageSize = evento.pageSize;
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

  private reordenarListaVisible(baseList: any[], listaVisible: any[], indiceOrigen: number, indiceDestino: number): any[] {
    const idsVisibles = listaVisible.map((item) => String(item.id));
    if (!idsVisibles.length) {
      return baseList;
    }

    const indiceVisibleOrigen = indiceOrigen;
    const indiceVisibleDestino = indiceDestino;
    if (indiceVisibleOrigen < 0 || indiceVisibleOrigen >= idsVisibles.length || indiceVisibleDestino < 0 || indiceVisibleDestino >= idsVisibles.length) {
      return baseList;
    }

    const idsReordenados = [...idsVisibles];
    moveItemInArray(idsReordenados, indiceVisibleOrigen, indiceVisibleDestino);
    const itemsReordenados = idsReordenados
      .map((id) => baseList.find((item) => String(item.id) === id))
      .filter(Boolean);

    const conjuntoVisibles = new Set(idsVisibles);
    let cursor = 0;

    return baseList.map((item) => {
      if (!conjuntoVisibles.has(String(item.id))) {
        return item;
      }

      return itemsReordenados[cursor++] ?? item;
    });
  }
}
