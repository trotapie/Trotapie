import { Component, HostListener, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MaterialModule } from 'app/shared/material.module';
import { SupabaseService } from 'app/core/supabase.service';
import { backdropFade, modalScaleFade } from 'app/shared/animations';

interface CondicionesDocumento {
  id: number;
  slug: string;
  titulo: string;
  descripcion: string;
  html_content: string;
  activo: boolean;
  orden: number | null;
}

interface PlaceholderField {
  key: string;
  label: string;
}

@Component({
  selector: 'app-condiciones-imprimir',
  standalone: true,
  imports: [MaterialModule, RouterLink, ReactiveFormsModule, FormsModule],
  templateUrl: './condiciones-imprimir.component.html',
  styleUrl: './condiciones-imprimir.component.scss',
  animations: [modalScaleFade, backdropFade],
})
export class CondicionesImprimirComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private fb = inject(FormBuilder);
  private sanitizer = inject(DomSanitizer);

  plantillas: CondicionesDocumento[] = [];
  cargandoPlantillas = false;
  error = '';

  mostrarModal = true;
  busquedaPlantillas = '';

  plantillaSeleccionada: CondicionesDocumento | null = null;

  form = this.fb.group<Record<string, any>>({});
  placeholderFields: PlaceholderField[] = [];
  currentFieldIndex = 0;
  previewHtml: SafeHtml = '';

  generandoPdf = false;

  mostrarExito = false;
  mensajeExito = '';

  async ngOnInit() {
    await this.cargarPlantillas();
  }

  get plantillasFiltradas(): CondicionesDocumento[] {
    const termino = this.normalizarTexto(this.busquedaPlantillas);
    if (!termino) return this.plantillas;
    return this.plantillas.filter((p) =>
      this.normalizarTexto(p.titulo).includes(termino) ||
      this.normalizarTexto(p.descripcion).includes(termino) ||
      this.normalizarTexto(p.slug).includes(termino)
    );
  }

  get hayPlaceholders(): boolean {
    return this.placeholderFields.length > 0;
  }

  get esPrimerCampo(): boolean {
    return this.currentFieldIndex <= 0;
  }

  get esUltimoCampo(): boolean {
    return this.currentFieldIndex >= this.placeholderFields.length - 1;
  }

  @HostListener('window:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent) {
    if (!this.plantillaSeleccionada || !this.hayPlaceholders) return;
    if (event.key === 'ArrowDown' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.campoSiguiente();
    } else if (event.key === 'ArrowUp' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.campoAnterior();
    }
  }

  abrirModalSeleccion() {
    this.mostrarModal = true;
    this.busquedaPlantillas = '';
  }

  seleccionarPlantilla(plantilla: CondicionesDocumento) {
    this.plantillaSeleccionada = plantilla;
    this.mostrarModal = false;
    this.construirFormulario(plantilla.html_content);
  }

  irAlCampo(index: number) {
    if (index < 0 || index >= this.placeholderFields.length) return;
    this.currentFieldIndex = index;
    setTimeout(() => {
      const key = this.placeholderFields[index]?.key;
      if (!key) return;
      const el = document.querySelector<HTMLElement>(`[data-placeholder-key="${key}"]`);
      el?.focus();
    }, 0);
  }

  campoSiguiente() {
    this.irAlCampo(this.currentFieldIndex + 1);
  }

  campoAnterior() {
    this.irAlCampo(this.currentFieldIndex - 1);
  }

  onKeydown(event: KeyboardEvent, index: number) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.irAlCampo(index + 1);
    }
    if (event.key === 'ArrowDown' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.campoSiguiente();
    } else if (event.key === 'ArrowUp' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.campoAnterior();
    }
  }

  trackByKey(index: number, field: PlaceholderField): string {
    return field.key;
  }

  async generarPdf() {
    if (!this.plantillaSeleccionada) return;

    this.generandoPdf = true;
    this.error = '';

    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      const element = document.querySelector('.preview-content') as HTMLElement;
      if (!element) throw new Error('No se encontro el contenido de la vista previa.');

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        allowTaint: false,
      });

      const orientation = canvas.height > canvas.width ? 'p' : 'l';
      const pdf = new jsPDF(orientation, 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      let remaining = imgHeight;
      let offsetY = 0;

      pdf.addImage(imgData, 'JPEG', 0, offsetY, pageWidth, imgHeight, undefined, 'FAST');
      remaining -= pageHeight;

      while (remaining > 0) {
        offsetY = remaining - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, offsetY, pageWidth, imgHeight, undefined, 'FAST');
        remaining -= pageHeight;
      }

      const slug = this.plantillaSeleccionada.slug || 'condiciones';
      pdf.save(`${slug}.pdf`);

      this.mostrarExito = true;
      this.mensajeExito = 'PDF generado correctamente.';
    } catch (err: any) {
      this.error = err?.message ?? 'No se pudo generar el PDF.';
    } finally {
      this.generandoPdf = false;
    }
  }

  reiniciar() {
    this.plantillaSeleccionada = null;
    this.placeholderFields = [];
    this.form = this.fb.group<Record<string, any>>({});
    this.currentFieldIndex = 0;
    this.previewHtml = '';
    this.mostrarModal = true;
  }

  private construirFormulario(html: string) {
    const matches = html.match(/{{\s*[\w.]+\s*}}/g) ?? [];
    const uniqueKeys = [...new Set(matches.map((m) => m.replace(/[{}]/g, '').trim()))];
    const group = this.fb.group<Record<string, any>>({});

    this.placeholderFields = uniqueKeys.map((key) => {
      group.addControl(key, this.fb.control(''));
      return { key, label: this.generarLabel(key) };
    });

    this.form = group;
    this.currentFieldIndex = 0;
    this.actualizarVistaPrevia();

    this.form.valueChanges.subscribe(() => {
      this.actualizarVistaPrevia();
    });
  }

  private generarLabel(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private actualizarVistaPrevia() {
    if (!this.plantillaSeleccionada) return;
    let html = this.plantillaSeleccionada.html_content;
    const values = this.form.getRawValue();
    for (const [key, value] of Object.entries(values)) {
      html = html.replace(new RegExp(`\\{\\{\\s*${this.escapeRegex(key)}\\s*\\}\\}`, 'g'), String(value ?? ''));
    }
    this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async cargarPlantillas() {
    this.cargandoPlantillas = true;
    this.error = '';
    try {
      const { data, error } = await this.supabase
        .getClient()
        .from('condiciones_documentos')
        .select('*')
        .order('orden', { ascending: true });
      if (error) throw error;
      this.plantillas = (data ?? []).map((item: any) => this.fromRow(item));
    } catch (err: any) {
      this.error = err?.message ?? 'No se pudieron cargar las plantillas.';
      this.plantillas = [];
    } finally {
      this.cargandoPlantillas = false;
    }
  }

  private fromRow(item: any): CondicionesDocumento {
    return {
      id: Number(item.id),
      slug: String(item.slug ?? '').trim(),
      titulo: String(item.titulo ?? item.nombre ?? item.clave ?? 'Sin titulo').trim(),
      descripcion: String(item.descripcion ?? item.resumen ?? '').trim(),
      html_content: String(item.html_content ?? ''),
      activo: item.activo === undefined || item.activo === null ? true : Boolean(item.activo),
      orden: item.orden === null || item.orden === undefined ? null : Number(item.orden),
    };
  }

  private normalizarTexto(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
  }
}
