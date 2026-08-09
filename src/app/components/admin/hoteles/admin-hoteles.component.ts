import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { PageEvent } from '@angular/material/paginator';
import { SupabaseService } from 'app/core/supabase.service';
import { DestinosService, PaisCatalogo } from 'app/core/destinos.service';
import { MaterialModule } from 'app/shared/material.module';
import { TpSelectSearchComponent, TpSelectSearchOption } from 'app/shared/tp-select-search/tp-select-search.component';

interface IDestinoFiltro {
  id: number;
  nombre: string;
  continente_id: number;
  continente_nombre: string;
  pais_id: number;
  pais_nombre: string;
}

interface IRegimen {
  id: number;
  descripcion: string;
}

interface IDestinoCatalogoFiltro {
  id: number;
  nombre: string;
  division_area_nombre?: string;
}

interface IContinente {
  id: number;
  nombre: string;
}

interface IHotelAdmin {
  id: number;
  nombre_hotel: string;
  regimen: string;
  regimen_id: number | null;
  orden: number | null;
  destino_id: number;
}

@Component({
  selector: 'app-admin-hoteles',
  standalone: true,
  imports: [FormsModule, MaterialModule, DragDropModule, TpSelectSearchComponent],
  templateUrl: './admin-hoteles.component.html',
  styleUrl: './admin-hoteles.component.scss'
})
export class AdminHotelesComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private destinosService = inject(DestinosService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  displayedColumns = ['nombre_hotel', 'regimen', 'orden', 'acciones'];

  destinos: IDestinoFiltro[] = [];
  destinosNacionalesCatalogo: IDestinoCatalogoFiltro[] = [];
  continentes: IContinente[] = [];
  private destinosConHotelesIds = new Set<number>();
  private paisesConHotelesIds = new Set<number>();
  private regionesConHotelesIds = new Set<number>();
  paisesCatalogo: PaisCatalogo[] = [];
  regimenes: IRegimen[] = [];
  hoteles: IHotelAdmin[] = [];
  hotelesOriginalIds: number[] = [];
  pageIndex = 0;
  pageSize = 10;
  pageSizeOptions = [10, 25, 50];

  tipoBusqueda: 'NACIONAL' | 'INTERNACIONAL' = 'NACIONAL';
  continenteSeleccionadoId: number | null = null;
  paisSeleccionadoId: number | null = null;
  destinoInternacionalId: number | null = null;
  destinoSeleccionadoId: number | null = null;
  cargando = true;
  cargandoHoteles = false;
  actualizandoOrden = false;
  eliminandoHotel = false;
  hayCambiosOrden = false;
  error = '';
  mostrarModalOrdenExito = false;
  mostrarModalConfirmarEliminarHotel = false;
  hotelAEliminar: IHotelAdmin | null = null;

  async ngOnInit() {
    try {
      this.cargando = true;
      const [regimenes] = await Promise.all([this.supabase.obtenerRegimenesAdmin(), this.cargarCatalogosDisponibles()]);
      this.regimenes = (regimenes ?? []) as IRegimen[];
      await this.aplicarPreseleccionDesdeQueryParams();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo cargar la informacion inicial.';
    } finally {
      this.cargando = false;
    }
  }

  get destinosNacionales(): IDestinoCatalogoFiltro[] {
    return this.destinosNacionalesCatalogo;
  }

  get paisesInternacionales(): IContinente[] {
    return this.paisesCatalogo.map((pais) => ({ id: pais.id, nombre: pais.nombre }));
  }

  get destinosInternacionalesPorPais(): IDestinoFiltro[] {
    if (!this.paisSeleccionadoId) return [];
    return this.destinos.filter(
      (d) => d.pais_id === this.paisSeleccionadoId
    );
  }

  get destinosNacionalesOpciones(): TpSelectSearchOption[] {
    return this.destinosNacionales.map((destino) => ({
      value: destino.id,
      label: destino.nombre,
      group: destino.division_area_nombre
    }));
  }

  get continentesOpciones(): TpSelectSearchOption[] {
    return this.continentes.map((continente) => ({ value: continente.id, label: continente.nombre }));
  }

  get paisesInternacionalesOpciones(): TpSelectSearchOption[] {
    return this.paisesInternacionales.map((pais) => ({ value: pais.id, label: pais.nombre }));
  }

  get destinosInternacionalesOpciones(): TpSelectSearchOption[] {
    return this.destinosInternacionalesPorPais.map((destino) => ({ value: destino.id, label: destino.nombre }));
  }

  get hotelesPaginados(): IHotelAdmin[] {
    const inicio = this.pageIndex * this.pageSize;
    return this.hoteles.slice(inicio, inicio + this.pageSize);
  }

  get puedeLimpiarFiltros(): boolean {
    return this.destinoSeleccionadoId !== null ||
      this.continenteSeleccionadoId !== null ||
      this.paisSeleccionadoId !== null ||
      this.destinoInternacionalId !== null;
  }

  cambiarTipoBusqueda(tipo: 'NACIONAL' | 'INTERNACIONAL') {
    this.tipoBusqueda = tipo;
    this.continenteSeleccionadoId = null;
    this.paisSeleccionadoId = null;
    this.destinoInternacionalId = null;
    this.paisesCatalogo = [];
    this.destinos = [];
    this.seleccionarDestino(null);
  }

  async limpiarFiltros(): Promise<void> {
    this.continenteSeleccionadoId = null;
    this.paisSeleccionadoId = null;
    this.destinoInternacionalId = null;
    this.destinoSeleccionadoId = null;
    this.paisesCatalogo = [];
    this.destinos = [];
    await this.seleccionarDestino(null);
  }

  async seleccionarDestino(destinoId: number | null) {
    this.destinoSeleccionadoId = destinoId;
    this.hoteles = [];
    this.hotelesOriginalIds = [];
    this.hayCambiosOrden = false;
    this.pageIndex = 0;
    this.error = '';

    if (!destinoId) return;

    try {
      this.cargandoHoteles = true;
      const hoteles = this.tipoBusqueda === 'NACIONAL'
        ? await this.supabase.obtenerHotelesAdminPorCatalogoDestino(destinoId)
        : this.destinoInternacionalId
          ? await this.supabase.obtenerHotelesAdminPorCatalogoDestino(destinoId)
          : await this.supabase.obtenerHotelesAdminPorPaisCatalogo(destinoId);
      this.hoteles = (hoteles ?? []) as IHotelAdmin[];
      this.hotelesOriginalIds = this.hoteles.map((item) => item.id);
      this.pageIndex = 0;
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron cargar los hoteles del destino.';
    } finally {
      this.cargandoHoteles = false;
    }
  }

  async seleccionarContinente(continenteId: number | null) {
    this.cargandoHoteles = true;
    this.continenteSeleccionadoId = continenteId;
    this.paisSeleccionadoId = null;
    this.destinoInternacionalId = null;
    this.destinos = [];
    try {
      this.paisesCatalogo = continenteId
        ? (await this.destinosService.obtenerCatalogoInternacionalPaises([continenteId]))
          .filter((pais) => this.paisesConHotelesIds.has(pais.id))
        : [];
      await this.seleccionarDestino(null);
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron cargar los países.';
    } finally {
      this.cargandoHoteles = false;
    }
  }

  async seleccionarPais(paisId: number | null) {
    this.cargandoHoteles = true;
    this.paisSeleccionadoId = paisId;
    this.destinoInternacionalId = null;
    try {
      this.destinos = paisId ? await this.obtenerDestinosInternacionalesCatalogo(paisId) : [];
      await this.seleccionarDestino(paisId);
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron cargar los destinos.';
    } finally {
      this.cargandoHoteles = false;
    }
  }

  async seleccionarDestinoInternacional(destinoId: number | null) {
    this.destinoInternacionalId = destinoId;
    if (destinoId) {
      await this.seleccionarDestino(destinoId);
      return;
    }

    await this.seleccionarDestino(this.paisSeleccionadoId);
  }

  private async aplicarPreseleccionDesdeQueryParams() {
    const params = this.route.snapshot.queryParamMap;
    const tipo = (params.get('tipo') ?? '').toUpperCase();

    if (tipo !== 'NACIONAL' && tipo !== 'INTERNACIONAL') {
      return;
    }

    this.tipoBusqueda = tipo as 'NACIONAL' | 'INTERNACIONAL';

    if (tipo === 'NACIONAL') {
      const destinoId = Number(params.get('destinoId'));
      if (Number.isFinite(destinoId)) {
        await this.seleccionarDestino(destinoId);
      }
      return;
    }

    const continenteId = Number(params.get('continenteId'));
    const paisId = Number(params.get('paisId'));
    const destinoId = Number(params.get('destinoId'));

    if (Number.isFinite(continenteId)) {
      await this.seleccionarContinente(continenteId);
    }

    if (Number.isFinite(paisId)) {
      this.paisSeleccionadoId = paisId;
      if (Number.isFinite(destinoId) && destinoId > 0) {
        this.destinoInternacionalId = destinoId;
        await this.seleccionarDestino(destinoId);
      } else {
        await this.seleccionarDestino(paisId);
      }
    }
  }

  drop(event: CdkDragDrop<IHotelAdmin[]>) {
    const inicioPagina = this.pageIndex * this.pageSize;
    const indiceOrigen = inicioPagina + event.previousIndex;
    const indiceDestino = inicioPagina + event.currentIndex;

    if (indiceOrigen === indiceDestino || indiceOrigen < 0 || indiceDestino < 0) {
      return;
    }

    moveItemInArray(this.hoteles, indiceOrigen, indiceDestino);
    this.hoteles = [...this.hoteles];
    this.hayCambiosOrden = !this.tieneMismoOrden();
    this.error = '';
  }

  private async obtenerDestinosInternacionalesCatalogo(paisId: number): Promise<IDestinoFiltro[]> {
    const ubicacionesConHoteles = await this.supabase.obtenerUbicacionesCatalogoConHoteles('INTERNACIONAL');
    const destinos = new Map<number, IDestinoFiltro>();

    for (const ubicacion of ubicacionesConHoteles) {
      if (ubicacion.paisId !== paisId || destinos.has(ubicacion.catalogoDestinoId)) continue;

      destinos.set(ubicacion.catalogoDestinoId, {
        id: ubicacion.catalogoDestinoId,
        nombre: ubicacion.catalogoDestinoNombre,
        continente_id: ubicacion.regionId,
        continente_nombre: '',
        pais_id: ubicacion.paisId,
        pais_nombre: ubicacion.paisNombre
      });
    }

    return [...destinos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  cambiarPagina(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  async actualizarOrden() {
    if (!this.hayCambiosOrden || this.actualizandoOrden) return;

    this.actualizandoOrden = true;
    this.error = '';
    this.mostrarModalOrdenExito = false;

    try {
      const payload = this.hoteles.map((item, index) => ({
        id: item.id,
        orden: index + 1
      }));

      await this.supabase.actualizarOrdenHoteles(payload);
      this.hotelesOriginalIds = this.hoteles.map((item) => item.id);
      this.hayCambiosOrden = false;
      this.mostrarModalOrdenExito = true;
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo actualizar el orden de hoteles.';
    } finally {
      this.actualizandoOrden = false;
    }
  }

  cerrarModalOrdenExito() {
    this.mostrarModalOrdenExito = false;
  }

  irAEdicion(hotel: IHotelAdmin) {
    this.router.navigate(['/admin/hoteles/editar', hotel.id], {
      queryParams: this.obtenerQueryParamsContexto()
    });
  }

  irACreacion() {
    this.router.navigate(['/admin/hoteles/editar', 'nuevo'], {
      queryParams: this.obtenerQueryParamsContexto()
    });
  }

  abrirModalConfirmarEliminarHotel(hotel: IHotelAdmin) {
    this.hotelAEliminar = hotel;
    this.mostrarModalConfirmarEliminarHotel = true;
    this.error = '';
  }

  cerrarModalConfirmarEliminarHotel() {
    this.mostrarModalConfirmarEliminarHotel = false;
    this.hotelAEliminar = null;
  }

  async confirmarEliminarHotel() {
    if (!this.hotelAEliminar || this.eliminandoHotel) return;

    const hotelId = this.hotelAEliminar.id;
    this.eliminandoHotel = true;
    this.error = '';

    try {
      await this.supabase.eliminarHotelAdmin(hotelId);
      this.hoteles = this.hoteles.filter((item) => item.id !== hotelId);
      this.hotelesOriginalIds = this.hoteles.map((item) => item.id);
      this.hayCambiosOrden = false;
      await this.cargarCatalogosDisponibles();
      await this.reconciliarFiltrosTrasRecarga();
      this.cerrarModalConfirmarEliminarHotel();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo eliminar el hotel.';
    } finally {
      this.eliminandoHotel = false;
    }
  }

  private tieneMismoOrden(): boolean {
    if (this.hoteles.length !== this.hotelesOriginalIds.length) return false;
    return this.hoteles.every((item, index) => item.id === this.hotelesOriginalIds[index]);
  }

  private async cargarCatalogosDisponibles(): Promise<void> {
    const [regiones, ubicacionesConHoteles] = await Promise.all([
      this.destinosService.obtenerCatalogoInternacionalRegiones(),
      this.supabase.obtenerUbicacionesCatalogoConHoteles()
    ]);
    const ubicacionesNacionales = ubicacionesConHoteles.filter((item) => item.tipo === 'NACIONAL');
    const ubicacionesInternacionales = ubicacionesConHoteles.filter((item) => item.tipo === 'INTERNACIONAL');
    this.destinosConHotelesIds = new Set(ubicacionesConHoteles.map((item) => item.catalogoDestinoId));
    this.paisesConHotelesIds = new Set(ubicacionesInternacionales.map((item) => item.paisId).filter((id) => id > 0));
    this.regionesConHotelesIds = new Set(ubicacionesInternacionales.map((item) => item.regionId).filter((id) => id > 0));
    this.destinosNacionalesCatalogo = [...new Map(ubicacionesNacionales.map((ubicacion) => [
      ubicacion.catalogoDestinoId,
      {
        id: ubicacion.catalogoDestinoId,
        nombre: ubicacion.catalogoDestinoNombre,
        division_area_nombre: ubicacion.divisionAreaNombre
      }
    ])).values()].sort((a, b) =>
      (a.division_area_nombre ?? '').localeCompare(b.division_area_nombre ?? '') || a.nombre.localeCompare(b.nombre)
    );
    this.continentes = (regiones ?? [])
      .filter((region) => this.regionesConHotelesIds.has(region.id))
      .map((region) => ({ id: region.id, nombre: region.nombre }));
  }

  private async reconciliarFiltrosTrasRecarga(): Promise<void> {
    if (this.tipoBusqueda === 'NACIONAL') {
      if (this.destinoSeleccionadoId && !this.destinosConHotelesIds.has(this.destinoSeleccionadoId)) {
        await this.seleccionarDestino(null);
      } else if (this.destinoSeleccionadoId) {
        await this.seleccionarDestino(this.destinoSeleccionadoId);
      }
      return;
    }

    const continenteId = this.continenteSeleccionadoId;
    const paisId = this.paisSeleccionadoId;
    const destinoId = this.destinoInternacionalId;
    if (!continenteId || !this.regionesConHotelesIds.has(continenteId)) {
      await this.limpiarFiltros();
      return;
    }

    await this.seleccionarContinente(continenteId);
    if (!paisId || !this.paisesConHotelesIds.has(paisId)) {
      return;
    }

    await this.seleccionarPais(paisId);
    if (destinoId && this.destinos.some((destino) => destino.id === destinoId)) {
      await this.seleccionarDestinoInternacional(destinoId);
    }
  }

  private obtenerQueryParamsContexto() {
    if (this.tipoBusqueda === 'NACIONAL') {
      return {
        tipo: 'NACIONAL',
        destinoId: this.destinoSeleccionadoId ?? null
      };
    }

    return {
      tipo: 'INTERNACIONAL',
      continenteId: this.continenteSeleccionadoId ?? null,
      paisId: this.paisSeleccionadoId ?? null,
      destinoId: this.destinoInternacionalId ?? null
    };
  }
}
