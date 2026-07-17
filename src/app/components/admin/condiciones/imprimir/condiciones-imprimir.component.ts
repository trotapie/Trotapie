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
  vista_previa_html: SafeHtml;
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
  pdfUrl = '';

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

  cerrarModal() {
    this.mostrarModal = false;
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
    const ventanaPdf = window.open('', '_blank');
    if (this.pdfUrl) URL.revokeObjectURL(this.pdfUrl);
    this.pdfUrl = '';
    let iframe: HTMLIFrameElement | null = null;

    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      const htmlPdf = this.obtenerHtmlConValores();
      iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;visibility:hidden;pointer-events:none;';
      iframe.setAttribute('aria-hidden', 'true');
      iframe.setAttribute('sandbox', 'allow-same-origin');
      document.body.appendChild(iframe);

      const documentPdf = iframe.contentDocument;
      if (!documentPdf) throw new Error('No se pudo preparar el documento para imprimir.');

      // html2canvas does not support oklch, so the PDF is rendered in an isolated document.
      const iframeCargado = new Promise<void>((resolve) => iframe!.onload = () => resolve());
      documentPdf.open();
      documentPdf.write(`<!doctype html>
        <html><head><style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 40px; background: #ffffff; color: #1e293b; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.55; }
          h1, h2, h3, h4, h5, h6 { color: inherit; font-weight: 700; }
          p { margin: 0 0 12px; }
          img { max-width: 100%; height: auto; }
          table { width: 100%; border-collapse: collapse; }
          td, th { border: 1px solid #cbd5e1; padding: 8px; }
          pre { overflow: auto; white-space: pre-wrap; }
        </style></head><body>${htmlPdf}</body></html>`);
      documentPdf.close();

      await iframeCargado;
      const canvas = await html2canvas(documentPdf.body, {
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

      this.pdfUrl = URL.createObjectURL(pdf.output('blob'));
      if (ventanaPdf) {
        ventanaPdf.location.href = this.pdfUrl;
      }

      this.mostrarExito = true;
      this.mensajeExito = ventanaPdf
        ? 'PDF generado y abierto en una nueva pestaña.'
        : 'El navegador bloqueo la nueva pestaña. Descarga el PDF desde este modal.';
    } catch (err: any) {
      ventanaPdf?.close();
      this.error = err?.message ?? 'No se pudo generar el PDF.';
    } finally {
      iframe?.remove();
      this.generandoPdf = false;
    }
  }

  reiniciar() {
    if (this.pdfUrl) URL.revokeObjectURL(this.pdfUrl);
    this.pdfUrl = '';
    this.plantillaSeleccionada = null;
    this.placeholderFields = [];
    this.form = this.fb.group<Record<string, any>>({});
    this.currentFieldIndex = 0;
    this.previewHtml = '';
    this.mostrarModal = true;
  }

  descargarPdf() {
    if (!this.pdfUrl) return;
    const enlace = document.createElement('a');
    enlace.href = this.pdfUrl;
    enlace.download = `${this.plantillaSeleccionada?.slug || 'condiciones'}.pdf`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
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
    this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(this.obtenerHtmlConValores());
  }

  private obtenerHtmlConValores(): string {
    if (!this.plantillaSeleccionada) return '';
    let html = this.plantillaSeleccionada.html_content;
    const values = this.form.getRawValue();
    for (const [key, value] of Object.entries(values)) {
      html = html.replace(new RegExp(`\\{\\{\\s*${this.escapeRegex(key)}\\s*\\}\\}`, 'g'), String(value ?? ''));
    }
    return html;
  }

  private crearVistaPreviaPlantilla(html: string): SafeHtml {
    const contenidoDeMuestra = html.replace(/{{\s*[\w.]+\s*}}/g, 'Informacion por completar');
    return this.sanitizer.bypassSecurityTrustHtml(contenidoDeMuestra);
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
      vista_previa_html: this.crearVistaPreviaPlantilla(String(item.html_content ?? '')),
      activo: item.activo === undefined || item.activo === null ? true : Boolean(item.activo),
      orden: item.orden === null || item.orden === undefined ? null : Number(item.orden),
    };
  }

  private normalizarTexto(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
  }
}
