import { Component, Input, OnInit, ViewChild, inject } from '@angular/core';
import { MaterialModule } from 'app/shared/material.module';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CanvasEditorComponent } from './components/canvas-editor/canvas-editor.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { LayersPanelComponent } from './components/layers-panel/layers-panel.component';
import { PropertiesPanelComponent } from './components/properties-panel/properties-panel.component';
import { TemplateGalleryComponent } from './components/template-gallery/template-gallery.component';
import { FlyerTemplateService } from 'app/shared/flyer-editor/services/flyer-template.service';
import { FlyerElement } from './models/flyer-element.interface';
import { FlyerTemplate, FlyerTemplateConfig } from './models/flyer-template.interface';
import { exportCanvasAsPDF, downloadPNG, shareImage } from './utils/export.utils';

@Component({
  selector: 'app-flyer-editor',
  standalone: true,
  imports: [
    MaterialModule,
    FormsModule,
    CanvasEditorComponent,
    ToolbarComponent,
    LayersPanelComponent,
    PropertiesPanelComponent,
    TemplateGalleryComponent,
  ],
  template: `
    <div class="flex min-w-0 flex-auto flex-col bg-gray-50 h-full">
      <div class="sticky top-0 z-[100] bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <button mat-icon-button (click)="volver()">
              <mat-icon [svgIcon]="'heroicons_outline:arrow-left'"></mat-icon>
            </button>
            <div>
              <h1 class="text-lg font-semibold text-gray-900">Editor de Flyer</h1>
              <p class="text-xs text-gray-500">{{ orientacion === 'portrait' ? 'Vertical 1080x1920' : 'Horizontal 1920x1080' }}</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button mat-stroked-button (click)="abrirGaleriaPlantillas()">
              <mat-icon class="icon-size-4 mr-1" [svgIcon]="'heroicons_outline:rectangle-stack'"></mat-icon>
              Plantillas
            </button>

            <button mat-stroked-button (click)="guardarBorrador()" [disabled]="guardando">
              @if (guardando) { Guardando... }
              @else { Guardar borrador }
            </button>

            <button mat-stroked-button (click)="exportarPNG()">
              <mat-icon class="icon-size-4 mr-1" [svgIcon]="'heroicons_outline:photo'"></mat-icon>
              PNG
            </button>

            <button mat-stroked-button (click)="exportarPDF()">
              <mat-icon class="icon-size-4 mr-1" [svgIcon]="'heroicons_outline:document-text'"></mat-icon>
              PDF
            </button>

            <button mat-raised-button color="primary" (click)="compartir()" class="text-white">
              <mat-icon class="icon-size-4 mr-1 text-white" [svgIcon]="'heroicons_outline:share'"></mat-icon>
              Compartir
            </button>
          </div>
        </div>
      </div>

      <div class="flex flex-1 overflow-hidden">
        <div class="w-56 shrink-0 border-r border-gray-200 bg-white p-4 overflow-auto flex flex-col gap-6">
          <app-flyer-toolbar
            (addText)="addText()"
            (addImage)="addImage()"
            (addRect)="canvasEditor?.addShape('rectangle')"
            (addCircle)="canvasEditor?.addShape('circle')"
            (addLine)="canvasEditor?.addLine()"
            (addPrice)="addPrice()"
            (deleteSelected)="canvasEditor?.deleteSelected()"
            (duplicateSelected)="canvasEditor?.duplicateSelected()">
          </app-flyer-toolbar>

          <mat-divider></mat-divider>

          <app-flyer-layers
            [elements]="elementos"
            [selectedId]="elementoSeleccionadoId"
            (selectLayer)="seleccionarCapaPorId($event)"
            (bringForward)="canvasEditor?.bringForward()"
            (sendBackwards)="canvasEditor?.sendBackwards()"
            (moveToTop)="canvasEditor?.moveToTop()"
            (moveToBottom)="canvasEditor?.moveToBottom()">
          </app-flyer-layers>
        </div>

        <div class="flex-1 overflow-auto p-6 relative">
          <app-canvas-editor
            #canvasEditor
            [ancho]="ancho"
            [alto]="alto"
            (elementSelected)="onElementSelected($event)"
            (elementsChanged)="onElementsChanged($event)"
            (canvasReady)="onCanvasReady($event)"
            (zoomChange)="zoomLevel = $event">
          </app-canvas-editor>

          <div class="absolute bottom-4 right-4 z-20 flex items-center gap-1 rounded-xl bg-white/90 backdrop-blur border border-gray-200 px-2 py-1.5 shadow-lg">
            <button mat-icon-button (click)="canvasEditor?.zoomOut()" matTooltip="Alejar"
              class="w-8 h-8 leading-none flex items-center justify-center rounded hover:bg-gray-100 text-gray-700">
              <mat-icon class="icon-size-4">remove</mat-icon>
            </button>
            <span class="text-xs font-medium text-gray-700 w-12 text-center select-none">{{ zoomLevel }}%</span>
            <button mat-icon-button (click)="canvasEditor?.zoomIn()" matTooltip="Acercar"
              class="w-8 h-8 leading-none flex items-center justify-center rounded hover:bg-gray-100 text-gray-700">
              <mat-icon class="icon-size-4">add</mat-icon>
            </button>
            <span class="w-px h-5 bg-gray-200 mx-1"></span>
            <button mat-icon-button (click)="canvasEditor?.resetZoom()" matTooltip="100%"
              class="w-8 h-8 leading-none flex items-center justify-center rounded hover:bg-gray-100 text-gray-700 text-xs font-medium">1:1</button>
            <button mat-icon-button (click)="canvasEditor?.fitToScreen()" matTooltip="Ajustar a la pantalla"
              class="w-8 h-8 leading-none flex items-center justify-center rounded hover:bg-gray-100 text-gray-700">
              <mat-icon class="icon-size-4">fit_screen</mat-icon>
            </button>
          </div>
        </div>

        <div class="w-64 shrink-0 border-l border-gray-200 bg-white p-4 overflow-auto">
          <app-flyer-properties
            [element]="elementoSeleccionado"
            (propertyChange)="onPropertyChange($event.key, $event.value)">
          </app-flyer-properties>
        </div>
      </div>
    </div>

    <app-flyer-template-gallery
      [open]="mostrarGaleria"
      [templates]="plantillas"
      [selectedId]="plantillaActualId"
      (select)="cargarPlantilla($event)"
      (close)="cerrarGaleriaPlantillas()">
    </app-flyer-template-gallery>

    @if (mostrarInputImagen) {
      <div class="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 px-4">
        <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <h3 class="text-lg font-semibold text-gray-900">Agregar imagen</h3>
          <p class="text-sm text-gray-500 mt-1">Pega la URL de la imagen</p>

          <mat-form-field class="w-full mt-4" subscriptSizing="dynamic">
            <mat-label>URL de la imagen</mat-label>
            <input matInput [(ngModel)]="urlImagenInput" placeholder="https://..." />
          </mat-form-field>

          <div class="mt-6 flex justify-end gap-2">
            <button mat-stroked-button (click)="cerrarInputImagen()">Cancelar</button>
            <button mat-flat-button color="primary" (click)="confirmarAgregarImagen()" [disabled]="!urlImagenInput">
              Agregar
            </button>
          </div>
        </div>
      </div>
    }

    @if (cargando) {
      <div class="fixed inset-0 z-[4000] flex items-center justify-center bg-black/30">
        <mat-spinner></mat-spinner>
      </div>
    }

    @if (mensajeExito) {
      <div class="fixed bottom-6 right-6 z-[5000] rounded-xl bg-green-600 px-5 py-3 text-white shadow-lg text-sm">
        {{ mensajeExito }}
      </div>
    }
  `,
  styles: [':host { display: contents; }']
})
export class FlyerEditorComponent implements OnInit {
  @Input() circuitoId: number | null = null;

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly templateService = inject(FlyerTemplateService);

  @ViewChild('canvasEditor') canvasEditor!: CanvasEditorComponent;

  ancho = 1080;
  alto = 1920;
  orientacion: 'portrait' | 'landscape' = 'portrait';

  cargando = false;
  guardando = false;
  mensajeExito = '';
  zoomLevel = 100;

  elementos: FlyerElement[] = [];
  elementoSeleccionado: FlyerElement | null = null;
  elementoSeleccionadoId: string | null = null;

  plantillas: FlyerTemplate[] = [];
  plantillaActualId: number | null = null;
  mostrarGaleria = false;

  mostrarInputImagen = false;
  urlImagenInput = '';

  async ngOnInit() {
    const paramId = this.route.snapshot.paramMap.get('circuitoId');
    if (paramId && !this.circuitoId) {
      const id = Number(paramId);
      if (Number.isFinite(id)) this.circuitoId = id;
    }
    await this.cargarPlantillas();
  }

  private async cargarPlantillas() {
    try {
      this.plantillas = await this.templateService.listarPlantillas();
    } catch (e) {
      console.error('Error cargando plantillas:', e);
    }
  }

  onCanvasReady(canvas: any) {
  }

  onElementSelected(el: FlyerElement | null) {
    this.elementoSeleccionado = el;
    this.elementoSeleccionadoId = el?.id ?? null;
  }

  onElementsChanged(elements: FlyerElement[]) {
    this.elementos = elements;
  }

  onPropertyChange(key: string, value: any) {
    this.canvasEditor?.updateSelectedProperty(key, value);
  }

  seleccionarCapaPorId(id: string) {
    const canvas = (this.canvasEditor as any)?.canvas;
    if (!canvas) return;
    const obj = canvas.getObjects().find((o: any) => o.id === id);
    if (obj) {
      canvas.setActiveObject(obj);
      canvas.renderAll();
    }
  }

  addText() {
    this.canvasEditor?.addText();
  }

  addImage() {
    this.mostrarInputImagen = true;
    this.urlImagenInput = '';
  }

  addPrice() {
    this.canvasEditor?.addPrice(0);
  }

  cerrarInputImagen() {
    this.mostrarInputImagen = false;
    this.urlImagenInput = '';
  }

  confirmarAgregarImagen() {
    if (this.urlImagenInput) {
      this.canvasEditor?.addImage(this.urlImagenInput);
    }
    this.cerrarInputImagen();
  }

  abrirGaleriaPlantillas() {
    this.mostrarGaleria = true;
  }

  cerrarGaleriaPlantillas() {
    this.mostrarGaleria = false;
  }

  async cargarPlantilla(template: FlyerTemplate) {
    this.mostrarGaleria = false;
    this.plantillaActualId = template.id ?? null;
    this.orientacion = template.orientacion;
    this.ancho = template.ancho;
    this.alto = template.alto;

    const config = template.config;
    if (config && config.elements) {
      this.canvasEditor?.loadFromConfig(config);
    }
  }

  async guardarBorrador() {
    if (!this.circuitoId) return;

    this.guardando = true;
    try {
      const config: FlyerTemplateConfig = {
        elements: this.canvasEditor?.getElements() ?? [],
        background: { type: 'color', value: '#ffffff' },
      };

      await this.templateService.guardarFlyerCircuito(
        this.circuitoId,
        this.plantillaActualId,
        config
      );

      this.mostrarMensaje('Borrador guardado');
    } catch (e: any) {
      console.error('Error guardando borrador:', e);
    } finally {
      this.guardando = false;
    }
  }

  async exportarPNG() {
    const dataUrl = this.canvasEditor?.getCanvasDataUrl('png', 2);
    if (dataUrl) {
      await downloadPNG(dataUrl, `flyer-circuito-${this.circuitoId ?? 'nuevo'}`);
    }
  }

  async exportarPDF() {
    const dataUrl = this.canvasEditor?.getCanvasDataUrl('png', 2);
    if (dataUrl) {
      await exportCanvasAsPDF(
        dataUrl,
        `flyer-circuito-${this.circuitoId ?? 'nuevo'}`,
        this.orientacion
      );
    }
  }

  async compartir() {
    const dataUrl = this.canvasEditor?.getCanvasDataUrl('png', 2);
    if (dataUrl) {
      await shareImage(dataUrl, `flyer-circuito-${this.circuitoId ?? 'nuevo'}`);
    }
  }

  volver() {
    if (this.circuitoId) {
      this.router.navigate(['/admin/circuitos/editar', this.circuitoId]);
    } else {
      this.router.navigate(['/admin/circuitos']);
    }
  }

  private mostrarMensaje(msg: string) {
    this.mensajeExito = msg;
    setTimeout(() => (this.mensajeExito = ''), 3000);
  }
}
