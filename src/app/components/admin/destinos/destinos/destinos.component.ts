import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { DestinoCatalogoNavegable, DestinosService, DivisionAreaCatalogo, PaisCatalogo, RegionCatalogo } from 'app/core/destinos.service';
import { MaterialModule } from 'app/shared/material.module';
import { TpMultiselectComponent, TpMultiselectOption } from 'app/shared/tp-multiselect/tp-multiselect.component';
import { TpSearchInputComponent } from 'app/shared/tp-search-input/tp-search-input.component';
import { ResumenCatalogoDestinosComponent } from '../resumen-catalogo-destinos/resumen-catalogo-destinos.component';
import { TpToastService } from 'app/shared/tp-toast/tp-toast.service';

@Component({ selector: 'app-destinos', standalone: true, imports: [MaterialModule, FormsModule, TpMultiselectComponent, TpSearchInputComponent], templateUrl: './destinos.component.html', styleUrl: './destinos.component.scss' })
export class DestinosComponent implements OnInit {
  private readonly destinosService = inject(DestinosService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(TpToastService);
  readonly displayedColumns = ['destino', 'ubicacion', 'estado', 'acciones'];
  tipoVisible: 'NACIONAL' | 'INTERNACIONAL' = 'NACIONAL';
  regiones: RegionCatalogo[] = []; paises: PaisCatalogo[] = []; divisiones: DivisionAreaCatalogo[] = [];
  regionIds: number[] = []; paisIds: number[] = []; divisionAreaIds: number[] = [];
  busqueda = ''; soloActivos = false; destinos: DestinoCatalogoNavegable[] = []; total = 0;
  pageIndex = 0; pageSize = 25; pageSizeOptions = [10, 25, 50, 100]; cargando = true; error = ''; activandoDestinoId: number | null = null;

  async ngOnInit() {
    this.restaurarEstadoDesdeUrl();
    await this.cargarFiltros();
    await this.cargarDestinos();
  }
  get divisionesOpciones(): TpMultiselectOption[] { return this.divisiones.map((item) => ({ value: item.id, label: item.nombre })); }
  get regionesOpciones(): TpMultiselectOption[] { return this.regiones.map((item) => ({ value: item.id, label: item.nombre })); }
  get paisesOpciones(): TpMultiselectOption[] { return this.paises.map((item) => ({ value: item.id, label: item.nombre })); }

  async seleccionarTipo(tipo: 'NACIONAL' | 'INTERNACIONAL') { if (tipo === this.tipoVisible) return; this.tipoVisible = tipo; this.regionIds = []; this.paisIds = []; this.divisionAreaIds = []; this.pageIndex = 0; await this.cargarFiltros(); await this.cargarDestinos(); this.actualizarUrlFiltros(); }
  async seleccionarRegion(ids: Array<string | number>) { this.regionIds = this.normalizarIds(ids); this.paisIds = []; this.pageIndex = 0; await this.cargarPaises(); await this.cargarDestinos(); this.actualizarUrlFiltros(); }
  async seleccionarPais(ids: Array<string | number>) { this.paisIds = this.normalizarIds(ids); this.pageIndex = 0; await this.cargarDestinos(); this.actualizarUrlFiltros(); }
  async seleccionarDivision(ids: Array<string | number>) { this.divisionAreaIds = this.normalizarIds(ids); this.pageIndex = 0; await this.cargarDestinos(); this.actualizarUrlFiltros(); }
  async alternarSoloActivos() { this.soloActivos = !this.soloActivos; this.pageIndex = 0; await this.cargarDestinos(); this.actualizarUrlFiltros(); }
  async buscar() { this.pageIndex = 0; await this.cargarDestinos(); this.actualizarUrlFiltros(); }
  async limpiarFiltros() { this.regionIds = []; this.paisIds = []; this.divisionAreaIds = []; this.busqueda = ''; this.soloActivos = false; this.pageIndex = 0; await this.cargarFiltros(); await this.cargarDestinos(); this.actualizarUrlFiltros(); }
  async cambiarPagina(event: PageEvent) { this.pageIndex = event.pageIndex; this.pageSize = event.pageSize; await this.cargarDestinos(); this.actualizarUrlFiltros(); }
  editarDestino(destino: DestinoCatalogoNavegable) { return this.router.navigate(['/admin/destinos/configurar-destinos/editar', destino.destinoId], { queryParams: this.obtenerQueryParamsFiltros() }); }
  editarPreview(destino: DestinoCatalogoNavegable) { return this.router.navigate(['/admin/destinos/configurar-destinos/preview', destino.destinoId], { queryParams: this.obtenerQueryParamsFiltros() }); }
  verHoteles(destino: DestinoCatalogoNavegable) { return this.router.navigate(['/admin/hoteles'], { queryParams: { catalogoDestinoId: destino.destinoId, divisionAreaId: destino.divisionAreaId, tipo: destino.tipo } }); }
  async activarDestino(destino: DestinoCatalogoNavegable) {
    if (destino.activo || this.activandoDestinoId !== null) return;
    this.activandoDestinoId = destino.destinoId;
    this.error = '';
    try {
      await this.destinosService.activarCatalogoDestinoAdmin(destino.destinoId);
      destino.activo = true;
      this.mostrarEstadoDestino('Destino activado', `${destino.destinoNombre} ya está disponible en el catálogo.`, 'success');
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo activar el destino.';
      this.toast.show({ title: 'No se pudo activar', message: this.error, variant: 'error' });
    } finally {
      this.activandoDestinoId = null;
    }
  }
  async desactivarDestino(destino: DestinoCatalogoNavegable) {
    if (!destino.activo || this.activandoDestinoId !== null) return;
    this.activandoDestinoId = destino.destinoId;
    this.error = '';
    try {
      await this.destinosService.desactivarCatalogoDestinoAdmin(destino.destinoId);
      destino.activo = false;
      this.mostrarEstadoDestino('Destino desactivado', `${destino.destinoNombre} ya no estará disponible públicamente.`, 'warning');
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo desactivar el destino.';
      this.toast.show({ title: 'No se pudo desactivar', message: this.error, variant: 'error' });
    } finally {
      this.activandoDestinoId = null;
    }
  }
  abrirResumen(): void {
    this.dialog.open(ResumenCatalogoDestinosComponent, {
      width: '780px',
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: 'calc(100dvh - 24px)',
      autoFocus: 'dialog',
      restoreFocus: true,
      panelClass: ['tp-motion-dialog-pane', 'resumen-catalogo-dialog']
    });
  }

  get tieneFiltrosActivos() { return Boolean(this.regionIds.length || this.paisIds.length || this.divisionAreaIds.length || this.busqueda.trim() || this.soloActivos); }
  get textoUbicacion() { return this.tipoVisible === 'NACIONAL' ? 'México por división de área' : 'Mundo por región y país'; }

  private async cargarFiltros() { if (this.tipoVisible === 'NACIONAL') { this.divisiones = await this.destinosService.obtenerCatalogoNacionalesDivisionAreas(); this.regiones = []; this.paises = []; return; } this.regiones = await this.destinosService.obtenerCatalogoInternacionalRegiones(); await this.cargarPaises(); this.divisiones = []; }
  private async cargarPaises() { this.paises = this.tipoVisible === 'INTERNACIONAL' ? await this.destinosService.obtenerCatalogoInternacionalPaises(this.regionIds) : []; }
  private async cargarDestinos() { this.cargando = true; this.error = ''; try { const pagina = await this.destinosService.buscarDestinosCatalogo({ tipo: this.tipoVisible, page: this.pageIndex, pageSize: this.pageSize, regionIds: this.regionIds, paisIds: this.paisIds, divisionAreaIds: this.divisionAreaIds, busqueda: this.busqueda, soloActivos: this.soloActivos }); this.destinos = pagina.items; this.total = pagina.total; } catch (error: any) { this.error = error?.message ?? 'No se pudieron cargar los destinos del catálogo.'; this.destinos = []; this.total = 0; } finally { this.cargando = false; } }
  private normalizarIds(ids: Array<string | number>): number[] { return ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0); }
  private restaurarEstadoDesdeUrl(): void {
    const params = this.route.snapshot.queryParamMap;
    this.tipoVisible = params.get('tipo') === 'INTERNACIONAL' ? 'INTERNACIONAL' : 'NACIONAL';
    this.regionIds = this.parsearIds(params.get('regionIds'));
    this.paisIds = this.parsearIds(params.get('paisIds'));
    this.divisionAreaIds = this.parsearIds(params.get('divisionAreaIds'));
    this.busqueda = params.get('busqueda') ?? '';
    this.soloActivos = params.get('soloActivos') === 'true';
    this.pageIndex = this.parsearNumero(params.get('page'), 0);
    const pageSize = this.parsearNumero(params.get('pageSize'), 25);
    this.pageSize = this.pageSizeOptions.includes(pageSize) ? pageSize : 25;
  }

  private parsearIds(value: string | null): number[] { return this.normalizarIds((value ?? '').split(',').filter(Boolean)); }
  private parsearNumero(value: string | null, fallback: number): number { const parsed = Number(value); return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback; }

  private obtenerQueryParamsFiltros() {
    return {
      tipo: this.tipoVisible,
      regionIds: this.regionIds.length ? this.regionIds.join(',') : null,
      paisIds: this.paisIds.length ? this.paisIds.join(',') : null,
      divisionAreaIds: this.divisionAreaIds.length ? this.divisionAreaIds.join(',') : null,
      busqueda: this.busqueda.trim() || null,
      soloActivos: this.soloActivos || null,
      page: this.pageIndex || null,
      pageSize: this.pageSize === 25 ? null : this.pageSize
    };
  }

  private actualizarUrlFiltros(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.obtenerQueryParamsFiltros(),
      replaceUrl: true
    });
  }

  private mostrarEstadoDestino(title: string, message: string, variant: 'success' | 'warning'): void {
    this.toast.show({ title, message, variant });
  }
}
