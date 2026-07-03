import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { MaterialModule } from 'app/shared/material.module';
import { FlyerElement } from '../../models/flyer-element.interface';
import { FlyerTemplateConfig } from '../../models/flyer-template.interface';
import * as fabric from 'fabric';

@Component({
  selector: 'app-canvas-editor',
  standalone: true,
  imports: [MaterialModule],
  template: `
    <div class="canvas-wrapper flex items-center justify-center bg-gray-100 rounded-xl overflow-hidden"
         [style.height]="'600px'" [style.width]="'100%'"
         (wheel)="onMouseWheel($event)">
      <div #canvasContainer class="relative shadow-2xl"
           [style.width.px]="ancho * zoomLevel"
           [style.height.px]="alto * zoomLevel"
           [style.transform]="'scale(1)'"
           style="transform-origin: top left; transition: width 0.15s, height 0.15s;">
        <canvas #canvasEl id="flyerCanvas"></canvas>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .canvas-wrapper { background: repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%) 50% / 20px 20px; }
  `]
})
export class CanvasEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasContainer') canvasContainer!: ElementRef<HTMLDivElement>;

  @Input() ancho = 1080;
  @Input() alto = 1920;

  @Output() elementSelected = new EventEmitter<FlyerElement | null>();
  @Output() elementsChanged = new EventEmitter<FlyerElement[]>();
  @Output() canvasReady = new EventEmitter<fabric.Canvas>();
  @Output() zoomChange = new EventEmitter<number>();

  canvas: fabric.Canvas | null = null;
  zoomLevel = 1;
  private readonly ZOOM_MIN = 0.1;
  private readonly ZOOM_MAX = 5;

  ngAfterViewInit() {
    this.initCanvas();
  }

  ngOnDestroy() {
    this.canvas?.dispose();
  }

  private initCanvas() {
    const el = this.canvasEl.nativeElement;
    el.width = this.ancho;
    el.height = this.alto;

    this.canvas = new fabric.Canvas(el, {
      width: this.ancho,
      height: this.alto,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
      defaultCursor: 'default',
    });

    this.canvas.on('selection:created', () => this.onSelectionChange());
    this.canvas.on('selection:updated', () => this.onSelectionChange());
    this.canvas.on('selection:cleared', () => this.elementSelected.emit(null));
    this.canvas.on('object:modified', () => this.emitElements());
    this.canvas.on('object:added', () => this.emitElements());
    this.canvas.on('object:removed', () => this.emitElements());

    this.canvasReady.emit(this.canvas);
    this.emitElements();
  }

  private onSelectionChange() {
    const active = this.canvas?.getActiveObject();
    if (active) {
      this.elementSelected.emit({
        id: (active as any).id ?? (active as any)._objectCache?.uid ?? `obj_${Date.now()}`,
        type: this.mapFabricType(active),
        fabricConfig: active.toObject(),
      });
    }
  }

  private mapFabricType(obj: fabric.FabricObject): FlyerElement['type'] {
    if (obj instanceof fabric.Textbox || obj instanceof fabric.IText) return 'text';
    if (obj instanceof fabric.Image) return 'image';
    if (obj instanceof fabric.Rect) return 'rectangle';
    if (obj instanceof fabric.Circle) return 'circle';
    if (obj instanceof fabric.Line) return 'line';
    return 'rectangle';
  }

  getElements(): FlyerElement[] {
    if (!this.canvas) return [];
    return this.canvas.getObjects().map((obj) => ({
      id: (obj as any).id ?? `obj_${Date.now()}_${Math.random()}`,
      type: this.mapFabricType(obj),
      fabricConfig: obj.toObject(),
    }));
  }

  private emitElements() {
    this.elementsChanged.emit(this.getElements());
  }

  loadFromConfig(config: FlyerTemplateConfig) {
    if (!this.canvas) return;
    this.canvas.clear();
    this.canvas.backgroundColor = this.parseBackground(config.background);

    for (const el of config.elements) {
      this.addElementFromConfig(el);
    }

    this.canvas.renderAll();
    this.emitElements();
  }

  private parseBackground(bg: any): string {
    if (!bg) return '#ffffff';
    return bg.value || '#ffffff';
  }

  private addElementFromConfig(el: FlyerElement) {
    if (!this.canvas) return;

    const { type, fabricConfig } = el;
    let obj: fabric.FabricObject | null = null;

    switch (type) {
      case 'text':
        obj = new fabric.Textbox(fabricConfig.text || 'Texto', {
          ...fabricConfig,
          id: el.id,
        });
        break;
      case 'rectangle':
        obj = new fabric.Rect({
          ...fabricConfig,
          id: el.id,
        });
        break;
      case 'circle':
        obj = new fabric.Circle({
          ...fabricConfig,
          id: el.id,
        });
        break;
      case 'line':
        obj = new fabric.Line(
          [fabricConfig.x1 || 0, fabricConfig.y1 || 0, fabricConfig.x2 || 100, fabricConfig.y2 || 100],
          { ...fabricConfig, id: el.id }
        );
        break;
      case 'image':
        if (fabricConfig.src) {
          fabric.FabricImage.fromURL(fabricConfig.src).then((img) => {
            img.set({ ...fabricConfig, id: el.id });
            this.canvas?.add(img);
            this.canvas?.renderAll();
            this.emitElements();
          });
          return;
        }
        break;
    }

    if (obj) {
      obj.set({ id: el.id } as any);
      this.canvas.add(obj);
    }
  }

  addText(text = 'Texto', options: Record<string, any> = {}) {
    if (!this.canvas) return;
    const obj = new fabric.Textbox(text, {
      left: 100,
      top: 100,
      width: 400,
      fontSize: 48,
      fontFamily: 'Arial',
      fill: '#1f2937',
      ...options,
    });
    obj.set({ id: `text_${Date.now()}` } as any);
    this.canvas.add(obj);
    this.canvas.setActiveObject(obj);
    this.canvas.renderAll();
  }

  addImage(src: string) {
    if (!this.canvas) return;
    fabric.FabricImage.fromURL(src).then((img) => {
      img.set({
        left: 100,
        top: 100,
        scaleX: 0.5,
        scaleY: 0.5,
        id: `img_${Date.now()}`,
      } as any);
      this.canvas?.add(img);
      this.canvas?.setActiveObject(img);
      this.canvas?.renderAll();
      this.emitElements();
    });
  }

  addShape(type: 'rectangle' | 'circle') {
    if (!this.canvas) return;

    let obj: fabric.FabricObject;

    if (type === 'rectangle') {
      obj = new fabric.Rect({
        left: 100,
        top: 100,
        width: 200,
        height: 200,
        fill: '#3b82f6',
        rx: 8,
        ry: 8,
        id: `rect_${Date.now()}`,
      } as any);
    } else {
      obj = new fabric.Circle({
        left: 100,
        top: 100,
        radius: 100,
        fill: '#ef4444',
        id: `circle_${Date.now()}`,
      } as any);
    }

    this.canvas.add(obj);
    this.canvas.setActiveObject(obj);
    this.canvas.renderAll();
  }

  addPrice(price: number, currency = 'MXN') {
    if (!this.canvas) return;
    const formatted = `$${price.toLocaleString('es-MX')} ${currency}`;
    const obj = new fabric.Textbox(formatted, {
      left: 100,
      top: 300,
      width: 400,
      fontSize: 64,
      fontFamily: 'Arial',
      fill: '#059669',
      fontWeight: 'bold',
      textAlign: 'center',
      id: `price_${Date.now()}`,
    } as any);
    this.canvas.add(obj);
    this.canvas.setActiveObject(obj);
    this.canvas.renderAll();
  }

  addLine() {
    if (!this.canvas) return;
    const obj = new fabric.Line([100, 400, 500, 400], {
      stroke: '#9ca3af',
      strokeWidth: 2,
      id: `line_${Date.now()}`,
    } as any);
    this.canvas.add(obj);
    this.canvas.renderAll();
  }

  getCanvasDataUrl(format = 'png', multiplier = 2): string {
    const currentZoom = this.canvas?.getZoom() ?? 1;
    if (this.canvas) {
      this.canvas.setZoom(1);
      this.canvas.renderAll();
    }
    const url = this.canvas?.toDataURL({ format: format as any, multiplier }) ?? '';
    if (this.canvas) {
      this.canvas.setZoom(currentZoom);
      this.canvas.renderAll();
    }
    return url;
  }

  deleteSelected() {
    const active = this.canvas?.getActiveObject();
    if (active) {
      this.canvas?.remove(active);
      this.canvas?.discardActiveObject();
      this.canvas?.renderAll();
    }
  }

  duplicateSelected() {
    const active = this.canvas?.getActiveObject();
    if (!active) return;

    active.clone().then((cloned) => {
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
        id: `dup_${Date.now()}`,
      } as any);
      this.canvas?.add(cloned);
      this.canvas?.setActiveObject(cloned);
      this.canvas?.renderAll();
    });
  }

  bringForward() {
    const active = this.canvas?.getActiveObject();
    if (active) {
      (this.canvas as any)?.bringForward(active);
      this.canvas?.renderAll();
    }
  }

  sendBackwards() {
    const active = this.canvas?.getActiveObject();
    if (active) {
      (this.canvas as any)?.sendBackwards(active);
      this.canvas?.renderAll();
    }
  }

  moveToTop() {
    const active = this.canvas?.getActiveObject();
    if (active) {
      (this.canvas as any)?.bringToFront(active);
      this.canvas?.renderAll();
    }
  }

  moveToBottom() {
    const active = this.canvas?.getActiveObject();
    if (active) {
      (this.canvas as any)?.sendToBack(active);
      this.canvas?.renderAll();
    }
  }

  updateSelectedProperty(key: string, value: any) {
    const active = this.canvas?.getActiveObject();
    if (active) {
      active.set(key as any, value);
      active.setCoords();
      this.canvas?.renderAll();
      this.emitElements();
    }
  }

  zoomIn() {
    this.setZoom(this.zoomLevel * 1.2);
  }

  zoomOut() {
    this.setZoom(this.zoomLevel / 1.2);
  }

  resetZoom() {
    this.setZoom(1);
  }

  fitToScreen() {
    if (!this.canvas) return;
    const wrapper = this.canvasContainer.nativeElement.parentElement;
    if (!wrapper) return;
    const wrapperW = wrapper.clientWidth - 24;
    const wrapperH = wrapper.clientHeight - 24;
    const scaleX = wrapperW / this.ancho;
    const scaleY = wrapperH / this.alto;
    const fit = Math.min(scaleX, scaleY, 1);
    this.setZoom(Math.max(0.1, fit));
  }

  onMouseWheel(event: WheelEvent) {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    if (event.deltaY < 0) {
      this.setZoom(this.zoomLevel * 1.1);
    } else {
      this.setZoom(this.zoomLevel / 1.1);
    }
  }

  private setZoom(level: number) {
    const clamped = Math.max(this.ZOOM_MIN, Math.min(this.ZOOM_MAX, level));
    if (clamped === this.zoomLevel) return;
    this.zoomLevel = clamped;
    if (!this.canvas) return;
    this.canvas.setZoom(this.zoomLevel);
    this.canvas.renderAll();
    this.zoomChange.emit(this.zoomLevel);
  }

  get activeObject() {
    return this.canvas?.getActiveObject() ?? null;
  }

  getObjects(): fabric.FabricObject[] {
    return this.canvas?.getObjects() ?? [];
  }
}
