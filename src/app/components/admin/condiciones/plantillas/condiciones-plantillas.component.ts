import { AfterViewInit, Component, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from 'app/shared/material.module';
import { SupabaseService } from 'app/core/supabase.service';

interface CondicionesDocumento {
  id: number;
  slug: string;
  titulo: string;
  descripcion: string;
  html_content: string;
  activo: boolean;
  orden: number | null;
}

interface CondicionesDocumentoRow {
  id: number | string;
  slug?: string | null;
  titulo?: string | null;
  nombre?: string | null;
  clave?: string | null;
  descripcion?: string | null;
  resumen?: string | null;
  html_content?: string | null;
  activo?: boolean | null;
  orden?: number | string | null;
}

@Component({
  selector: 'app-condiciones-plantillas',
  standalone: true,
  imports: [MaterialModule, RouterLink, ReactiveFormsModule, FormsModule],
  templateUrl: './condiciones-plantillas.component.html',
  styleUrl: './condiciones-plantillas.component.scss',
})
export class CondicionesPlantillasComponent implements OnInit, AfterViewInit {
  private readonly supabase = inject(SupabaseService);
  private readonly fb = inject(FormBuilder);

  @ViewChild('previewEditable') previewEditable?: ElementRef<HTMLElement>;

  plantillas: CondicionesDocumento[] = [];
  selectedPlantillaId: number | null = null;
  cargando = false;
  guardando = false;
  error = '';
  mostrarExito = false;
  mensajeExito = '';
  mostrarPanelEditor = false;
  busquedaPlantillas = '';
  private snapshotPlantillaInicial = '';

  form = this.fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(200)]],
    descripcion: [''],
    slug: ['', [Validators.required, Validators.maxLength(120)]],
    orden: [null as number | null],
    activo: [true],
    html_content: [''],
  });

  async ngOnInit() {
    await this.cargarPlantillas();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.sincronizarVistaPreviaEditable(), 0);
  }

  get plantillaSeleccionada(): CondicionesDocumento | null {
    return this.plantillas.find((item) => item.id === this.selectedPlantillaId) ?? null;
  }

  get tieneCambiosPendientes(): boolean {
    return this.snapshotPlantillaInicial !== '' && !this.guardando &&
      this.serializarFormulario() !== this.snapshotPlantillaInicial;
  }

  get htmlPreview(): string {
    return String(this.form.get('html_content')?.value ?? '');
  }

  get plantillasFiltradas(): CondicionesDocumento[] {
    const termino = this.normalizarTexto(this.busquedaPlantillas);
    if (!termino) return this.plantillas;

    return this.plantillas.filter((plantilla) =>
      this.normalizarTexto(plantilla.titulo).includes(termino) ||
      this.normalizarTexto(plantilla.slug).includes(termino) ||
      this.normalizarTexto(plantilla.descripcion).includes(termino) ||
      this.normalizarTexto(plantilla.orden).includes(termino)
    );
  }

  @HostListener('window:beforeunload', ['$event'])
  handleBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.tieneCambiosPendientes || this.guardando) return;
    event.preventDefault();
    event.returnValue = 'Tienes cambios pendientes.';
  }

  seleccionarPlantilla(plantilla: CondicionesDocumento) {
    if (this.tieneCambiosPendientes && this.selectedPlantillaId !== plantilla.id) {
      const continuar = window.confirm('Tienes cambios sin guardar. Si cambias de plantilla se perderan. ¿Quieres continuar?');
      if (!continuar) return;
    }

    this.selectedPlantillaId = plantilla.id;
    this.cargarFormulario(plantilla);
  }

  async recargar() {
    await this.cargarPlantillas();
  }

  restaurarPlantillaActual() {
    const plantilla = this.plantillaSeleccionada;
    if (!plantilla) return;
    this.cargarFormulario(plantilla);
  }

  alternarPanelEditor() {
    this.mostrarPanelEditor = !this.mostrarPanelEditor;
  }

  actualizarHtmlDesdeVistaPrevia(event: Event): void {
    const target = event.currentTarget as HTMLElement | null;
    if (!target) return;

    const control = this.form.get('html_content');
    control?.setValue(target.innerHTML, { emitEvent: false });
    control?.markAsDirty();
  }

  async guardar() {
    const plantilla = this.plantillaSeleccionada;
    if (!plantilla) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando = true;
    this.error = '';
    this.mostrarExito = false;

    try {
      const raw = this.form.getRawValue();
      const payload = {
        titulo: String(raw.titulo ?? '').trim(),
        descripcion: String(raw.descripcion ?? '').trim(),
        slug: String(raw.slug ?? '').trim(),
        orden: this.normalizarOrden(raw.orden),
        activo: raw.activo ?? true,
        html_content: String(raw.html_content ?? ''),
      };

      const { data, error } = await this.supabase
        .getClient()
        .from('condiciones_documentos')
        .update(payload)
        .eq('id', plantilla.id)
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('No se pudo actualizar la plantilla.');

      const fila = data as CondicionesDocumentoRow;
      const plantillaActualizada = this.fromRow(fila);

      this.plantillas = this.plantillas.map((item) =>
        item.id === plantilla.id ? plantillaActualizada : item
      );

      this.selectedPlantillaId = plantillaActualizada.id;
      this.cargarFormulario(plantillaActualizada);
      this.mensajeExito = 'Plantilla actualizada correctamente.';
      this.mostrarExito = true;
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo guardar la plantilla.';
    } finally {
      this.guardando = false;
    }
  }

  private async cargarPlantillas() {
    this.cargando = true;
    this.error = '';

    try {
      const { data, error } = await this.supabase
        .getClient()
        .from('condiciones_documentos')
        .select('*')
        .order('orden', { ascending: true });

      if (error) throw error;

      this.plantillas = (data ?? []).map((item: any) => this.fromRow(item));
      if (!this.selectedPlantillaId) {
        this.limpiarFormulario();
      }
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron cargar las plantillas.';
      this.plantillas = [];
      this.selectedPlantillaId = null;
      this.limpiarFormulario();
    } finally {
      this.cargando = false;
    }
  }

  private limpiarFormulario(): void {
    this.form.reset({
      titulo: '',
      descripcion: '',
      slug: '',
      orden: null,
      activo: true,
      html_content: '',
    });
    this.snapshotPlantillaInicial = '';
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private cargarFormulario(plantilla: CondicionesDocumento): void {
    this.form.patchValue({
      titulo: plantilla.titulo ?? '',
      descripcion: plantilla.descripcion ?? '',
      slug: plantilla.slug ?? '',
      orden: plantilla.orden ?? null,
      activo: plantilla.activo ?? true,
      html_content: plantilla.html_content ?? '',
    });
    this.marcarEstadoGuardado();
    setTimeout(() => this.sincronizarVistaPreviaEditable(), 0);
  }

  private marcarEstadoGuardado(): void {
    this.snapshotPlantillaInicial = this.serializarFormulario();
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private serializarFormulario(): string {
    const raw = this.form.getRawValue();
    return JSON.stringify({
      titulo: String(raw.titulo ?? '').trim(),
      descripcion: String(raw.descripcion ?? '').trim(),
      slug: String(raw.slug ?? '').trim(),
      orden: this.normalizarOrden(raw.orden),
      activo: raw.activo ?? true,
      html_content: String(raw.html_content ?? ''),
    });
  }

  private normalizarOrden(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const numero = Number(value);
    return Number.isFinite(numero) ? numero : null;
  }

  private normalizarTexto(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private fromRow(item: CondicionesDocumentoRow): CondicionesDocumento {
    return {
      id: Number(item.id),
      slug: String(item.slug ?? '').trim(),
      titulo: String(item.titulo ?? item.nombre ?? item.clave ?? 'Sin titulo').trim(),
      descripcion: String(item.descripcion ?? item.resumen ?? '').trim(),
      html_content: String(item.html_content ?? ''),
      activo: item.activo === undefined || item.activo === null ? true : Boolean(item.activo),
      orden: this.normalizarOrden(item.orden),
    };
  }

  private sincronizarVistaPreviaEditable(): void {
    const element = this.previewEditable?.nativeElement;
    if (!element) return;

    const html = this.htmlPreview;
    if (element.innerHTML !== html) {
      element.innerHTML = html;
    }
  }
}
