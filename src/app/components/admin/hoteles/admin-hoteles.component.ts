import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { SupabaseService } from 'app/core/supabase.service';
import { MaterialModule } from 'app/shared/material.module';

interface IDestinoFiltro {
  id: number;
  nombre: string;
  tipo_desino_id: number;
  destino_padre_id: number | null;
  continente_id?: number | null;
}

interface IRegimen {
  id: number;
  descripcion: string;
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
  imports: [MaterialModule, DragDropModule],
  templateUrl: './admin-hoteles.component.html',
  styleUrl: './admin-hoteles.component.scss'
})
export class AdminHotelesComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  displayedColumns = ['nombre_hotel', 'regimen', 'orden', 'acciones'];

  destinos: IDestinoFiltro[] = [];
  continentes: IContinente[] = [];
  regimenes: IRegimen[] = [];
  hoteles: IHotelAdmin[] = [];
  hotelesOriginalIds: number[] = [];

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
      const [destinos, regimenes] = await Promise.all([
        this.supabase.obtenerDestinosAdmin(),
        this.supabase.obtenerRegimenesAdmin()
      ]);

      this.destinos = (destinos ?? []) as IDestinoFiltro[];
      this.regimenes = (regimenes ?? []) as IRegimen[];
      const continentesResponse = await this.supabase.continentes();
      this.continentes = (continentesResponse.data ?? []) as IContinente[];
      await this.aplicarPreseleccionDesdeQueryParams();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo cargar la informacion inicial.';
    } finally {
      this.cargando = false;
    }
  }

  get destinosNacionales(): IDestinoFiltro[] {
    return this.destinos.filter((d) => d.tipo_desino_id === 1);
  }

  get paisesInternacionales(): IDestinoFiltro[] {
    return this.destinos.filter(
      (d) =>
        d.tipo_desino_id === 2 &&
        d.destino_padre_id === null &&
        (this.continenteSeleccionadoId ? d.continente_id === this.continenteSeleccionadoId : true)
    );
  }

  get destinosInternacionalesPorPais(): IDestinoFiltro[] {
    if (!this.paisSeleccionadoId) return [];
    return this.destinos.filter(
      (d) => d.tipo_desino_id === 2 && d.destino_padre_id === this.paisSeleccionadoId
    );
  }

  cambiarTipoBusqueda(tipo: 'NACIONAL' | 'INTERNACIONAL') {
    this.tipoBusqueda = tipo;
    this.continenteSeleccionadoId = null;
    this.paisSeleccionadoId = null;
    this.destinoInternacionalId = null;
    this.seleccionarDestino(null);
  }

  async seleccionarDestino(destinoId: number | null) {
    this.destinoSeleccionadoId = destinoId;
    this.hoteles = [];
    this.hotelesOriginalIds = [];
    this.hayCambiosOrden = false;
    this.error = '';

    if (!destinoId) return;

    try {
      this.cargandoHoteles = true;
      const hoteles = this.tipoBusqueda === 'NACIONAL'
        ? await this.supabase.obtenerHotelesAdminPorDestino(destinoId)
        : this.destinoInternacionalId
          ? await this.supabase.obtenerHotelesAdminPorDestino(destinoId)
          : await this.supabase.obtenerHotelesAdminPorDestinoPadre(destinoId);
      this.hoteles = (hoteles ?? []) as IHotelAdmin[];
      this.hotelesOriginalIds = this.hoteles.map((item) => item.id);
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron cargar los hoteles del destino.';
    } finally {
      this.cargandoHoteles = false;
    }
  }

  async seleccionarContinente(continenteId: number | null) {
    this.continenteSeleccionadoId = continenteId;
    this.paisSeleccionadoId = null;
    this.destinoInternacionalId = null;
    await this.seleccionarDestino(null);
  }

  async seleccionarPais(paisId: number | null) {
    this.paisSeleccionadoId = paisId;
    this.destinoInternacionalId = null;
    await this.seleccionarDestino(paisId);
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
      this.continenteSeleccionadoId = continenteId;
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
    moveItemInArray(this.hoteles, event.previousIndex, event.currentIndex);
    this.hoteles = [...this.hoteles];
    this.hayCambiosOrden = !this.tieneMismoOrden();
    this.error = '';
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
