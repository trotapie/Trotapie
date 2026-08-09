import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { DestinosService, ConfiguracionGeograficaTipo, RegistroGeograficoAdmin } from 'app/core/destinos.service';
import { MaterialModule } from 'app/shared/material.module';
import { TpInputComponent } from 'app/shared/tp-input/tp-input.component';
import { TpSelectSearchComponent, TpSelectSearchOption } from 'app/shared/tp-select-search/tp-select-search.component';

@Component({
  selector: 'app-configuracion-geografica',
  standalone: true,
  imports: [MaterialModule, RouterLink, TpInputComponent, TpSelectSearchComponent],
  templateUrl: './configuracion-geografica.component.html',
  styleUrl: './configuracion-geografica.component.scss'
})
export class ConfiguracionGeograficaComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destinos = inject(DestinosService);
  private readonly fb = inject(FormBuilder);

  tipo: ConfiguracionGeograficaTipo = 'continentes';
  registros: RegistroGeograficoAdmin[] = [];
  continentes: RegistroGeograficoAdmin[] = [];
  paises: RegistroGeograficoAdmin[] = [];
  cargando = true;
  guardando = false;
  error = '';
  busqueda = '';
  pagina = 0;
  readonly tamanoPagina = 25;
  editando: RegistroGeograficoAdmin | null = null;
  modalAbierto = false;
  readonly form = this.fb.group({
    nombre: ['', Validators.required], slug: ['', Validators.required], iso2: ['', [Validators.minLength(2), Validators.maxLength(2)]],
    region_id: [null as number | null], pais_id: [null as number | null]
  });

  get titulo(): string { return this.tipo === 'continentes' ? 'Continentes' : this.tipo === 'paises' ? 'Países' : 'Divisiones de área'; }
  get descripcion(): string { return this.tipo === 'continentes' ? 'Organiza la cobertura internacional y consulta su estructura.' : this.tipo === 'paises' ? 'Administra los países vinculados a cada continente.' : 'Configura las divisiones que agrupan los destinos de cada país.'; }
  get registrosFiltrados(): RegistroGeograficoAdmin[] {
    const filtro = this.busqueda.trim().toLocaleLowerCase();
    return filtro ? this.registros.filter((r) => [r.nombre, r.region_nombre, r.pais_nombre, r.iso2].some((v) => String(v ?? '').toLocaleLowerCase().includes(filtro))) : this.registros;
  }
  get registrosPaginados(): RegistroGeograficoAdmin[] {
    const inicio = this.pagina * this.tamanoPagina;
    return this.registrosFiltrados.slice(inicio, inicio + this.tamanoPagina);
  }
  get totalPaginas(): number { return Math.max(1, Math.ceil(this.registrosFiltrados.length / this.tamanoPagina)); }
  get desdeRegistro(): number { return this.registrosFiltrados.length ? this.pagina * this.tamanoPagina + 1 : 0; }
  get hastaRegistro(): number { return Math.min((this.pagina + 1) * this.tamanoPagina, this.registrosFiltrados.length); }
  get continentesOpciones(): TpSelectSearchOption[] { return this.continentes.map((r) => ({ value: r.id, label: r.nombre })); }
  get paisesOpciones(): TpSelectSearchOption[] { return this.paises.map((r) => ({ value: r.id, label: `${r.nombre} · ${r.region_nombre}` })); }

  async ngOnInit(): Promise<void> {
    this.tipo = this.route.snapshot.data['tipo'] as ConfiguracionGeograficaTipo;
    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando = true; this.error = '';
    try {
      const [registros, continentes, paises] = await Promise.all([
        this.destinos.obtenerConfiguracionGeografica(this.tipo),
        this.tipo === 'continentes' ? Promise.resolve([]) : this.destinos.obtenerConfiguracionGeografica('continentes'),
        this.tipo === 'divisiones-area' ? this.destinos.obtenerConfiguracionGeografica('paises') : Promise.resolve([])
      ]);
      this.registros = registros; this.continentes = continentes; this.paises = paises; this.pagina = 0;
    } catch (error: any) { this.error = error?.message ?? 'No se pudo cargar la configuración.'; }
    finally { this.cargando = false; }
  }

  nuevo(): void { this.editando = null; this.modalAbierto = true; this.form.reset({ nombre: '', slug: '', iso2: '', region_id: null, pais_id: null }); }
  editar(registro: RegistroGeograficoAdmin): void {
    this.editando = registro;
    this.modalAbierto = true;
    this.form.reset({ nombre: registro.nombre, slug: registro.slug, iso2: registro.iso2 ?? '', region_id: registro.region_id ?? null, pais_id: registro.pais_id ?? null });
  }
  cancelar(): void { this.editando = null; this.modalAbierto = false; this.form.reset(); }
  actualizarBusqueda(valor: string): void { this.busqueda = valor; this.pagina = 0; }
  paginaAnterior(): void { this.pagina = Math.max(0, this.pagina - 1); }
  paginaSiguiente(): void { this.pagina = Math.min(this.totalPaginas - 1, this.pagina + 1); }
  actualizarSlug(): void { if (!this.editando) this.form.patchValue({ slug: String(this.form.value.nombre ?? '').toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }); }
  async guardar(): Promise<void> {
    if (this.form.invalid || (this.tipo === 'paises' && !this.form.value.region_id) || (this.tipo === 'divisiones-area' && !this.form.value.pais_id)) { this.form.markAllAsTouched(); return; }
    this.guardando = true; this.error = '';
    try { await this.destinos.guardarConfiguracionGeografica(this.tipo, { ...this.form.getRawValue(), id: this.editando?.id }); this.cancelar(); await this.cargar(); }
    catch (error: any) { this.error = error?.message ?? 'No se pudo guardar el registro.'; }
    finally { this.guardando = false; }
  }
  async eliminar(registro: RegistroGeograficoAdmin): Promise<void> {
    if (!confirm(`¿Eliminar ${registro.nombre}? Esta acción no se puede deshacer.`)) return;
    try { await this.destinos.eliminarConfiguracionGeografica(this.tipo, registro.id); await this.cargar(); }
    catch (error: any) { this.error = error?.message?.includes('violates foreign key') ? 'No se puede eliminar porque tiene registros relacionados.' : error?.message ?? 'No se pudo eliminar el registro.'; }
  }
}
