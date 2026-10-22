import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { ConfiguracionFondo, normalizarConfiguracionFondo, nuevaConfiguracionFondo, POSICIONES_IMAGEN } from 'app/core/imagen-fondo-visual';
import { MaterialModule } from 'app/shared/material.module';
import { TpInputComponent } from 'app/shared/tp-input/tp-input.component';
import { TpTextareaComponent } from 'app/shared/tp-textarea/tp-textarea.component';
import { CustomSwitchComponent } from 'app/shared/custom-switch/custom-switch.component';
import { ColorPickerComponent } from 'app/shared/color-picker/color-picker.component';
import { ElementoVisual, ImageVisualPreviewComponent } from '../image-visual-preview/image-visual-preview.component';

export interface ImagenVisualDraft {
  url: string;
  nombre: string;
  activo: boolean;
  config: ConfiguracionFondo;
}

@Component({
  selector: 'app-image-visual-editor',
  imports: [CommonModule, FormsModule, A11yModule, MaterialModule, TpInputComponent, TpTextareaComponent,
    CustomSwitchComponent, ColorPickerComponent, ImageVisualPreviewComponent],
  templateUrl: './image-visual-editor.component.html',
  styleUrl: './image-visual-editor.component.scss'
})
export class ImageVisualEditorComponent implements OnInit {
  @Input() value!: ImagenVisualDraft;
  @Input() saving = false;
  @Input() nameOnly = false;
  @Output() save = new EventEmitter<ImagenVisualDraft>();
  @Output() cancel = new EventEmitter<void>();
  draft!: ImagenVisualDraft;
  readonly posiciones = POSICIONES_IMAGEN;
  get textos(): ReadonlyArray<'titulo' | 'descripcion' | 'etiqueta'> {
    return this.nameOnly ? ['titulo'] : ['titulo', 'descripcion', 'etiqueta'];
  }
  get objetivos(): ReadonlyArray<'imagen' | 'titulo' | 'descripcion'> {
    return this.nameOnly ? ['imagen', 'titulo'] : ['imagen', 'titulo', 'descripcion'];
  }
  readonly dispositivos = [
    { key: 'desktop', label: 'Escritorio', icon: 'desktop_windows', width: 600, ratio: '600 / 630' },
    { key: 'tablet', label: 'Tablet', icon: 'tablet_mac', width: 520, ratio: '520 / 700' },
    { key: 'phone', label: 'Móvil', icon: 'phone_iphone', width: 360, ratio: '360 / 640' }
  ];
  textoSeleccionado: 'titulo' | 'descripcion' | 'etiqueta' = 'titulo';
  objetivo: 'imagen' | 'titulo' | 'descripcion' = 'imagen';
  dispositivo = this.dispositivos[0];
  vistaDispositivos = false;
  confirmarSalida = false;
  private original = '';
  private drag: { id: number; target: ElementoVisual; startX: number; startY: number; x: number; y: number; width: number; height: number; element: HTMLElement } | null = null;

  ngOnInit(): void {
    this.draft = { ...this.value, config: normalizarConfiguracionFondo(this.value.config) };
    this.original = JSON.stringify(this.draft);
  }

  get config(): ConfiguracionFondo { return this.draft.config; }
  get presentacion() { return this.objetivo === 'imagen' ? this.config : this.config[`${this.objetivo}_presentacion`]; }
  get valid(): boolean { return /^https?:\/\//i.test(this.draft.url.trim()) && !!this.draft.nombre.trim(); }

  nombreElemento(target: ElementoVisual): string {
    return { imagen: 'Imagen', titulo: this.nameOnly ? 'Nombre' : 'Título', descripcion: 'Descripción', etiqueta: 'Etiqueta' }[target];
  }

  seleccionarPosicion(x: number, y: number): void {
    this.config[`${this.textoSeleccionado}_x`] = x;
    this.config[`${this.textoSeleccionado}_y`] = y;
  }

  cambiarZoom(delta: number): void {
    this.config.imagen_zoom = Math.min(3, Math.max(0.1, Math.round((this.config.imagen_zoom + delta) * 10) / 10));
  }

  restablecerEncuadre(): void { Object.assign(this.config, { imagen_zoom: 1, imagen_x: 50, imagen_y: 50 }); }
  restablecer(): void {
    const { descripciones, etiquetas, etiqueta_texto } = this.config;
    this.draft.config = { ...nuevaConfiguracionFondo(), descripciones: { ...descripciones }, etiquetas: { ...etiquetas }, etiqueta_texto };
  }
  restablecerPresentacion(): void {
    const base = nuevaConfiguracionFondo();
    if (this.objetivo === 'imagen') {
      Object.assign(this.config, { oscurecer_fondo: base.oscurecer_fondo, efecto_activo: true,
        overlay_color: base.overlay_color, overlay_opacidad: base.overlay_opacidad, blur_px: 0 });
    } else this.config[`${this.objetivo}_presentacion`] = { ...base[`${this.objetivo}_presentacion`] };
  }

  solicitarCerrar(): void {
    if (this.saving) return;
    if (JSON.stringify(this.draft) !== this.original) this.confirmarSalida = true;
    else this.cancel.emit();
  }

  guardar(): void {
    if (this.valid && !this.saving) this.save.emit({ ...this.draft, url: this.draft.url.trim(), nombre: this.draft.nombre.trim(), config: normalizarConfiguracionFondo(this.config) });
  }

  @HostListener('document:keydown.escape', ['$event'])
  escape(event: KeyboardEvent): void {
    event.stopPropagation();
    if (this.vistaDispositivos) this.vistaDispositivos = false;
    else if (this.confirmarSalida) this.confirmarSalida = false;
    else this.solicitarCerrar();
  }

  iniciarArrastre({ event, target }: { event: PointerEvent; target: ElementoVisual }): void {
    if (this.saving || event.button !== 0) return;
    const element = event.currentTarget as HTMLElement;
    const stage = element.closest('.visual-stage') as HTMLElement;
    const rect = stage.getBoundingClientRect();
    const image = stage.querySelector('img');
    const scale = this.config.imagen_zoom * (this.config.efecto_activo && this.config.blur_px > 0 ? 1.05 : 1);
    const width = rect.width - (target === 'imagen' ? (image?.offsetWidth ?? rect.width) * scale : element.offsetWidth);
    const height = rect.height - (target === 'imagen' ? (image?.offsetHeight ?? rect.height) * scale : element.offsetHeight);
    this.drag = { id: event.pointerId, target, element, startX: event.clientX, startY: event.clientY,
      x: this.config[`${target}_x`], y: this.config[`${target}_y`], width, height };
    element.setPointerCapture(event.pointerId);
  }

  @HostListener('window:pointermove', ['$event'])
  mover(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || drag.id !== event.pointerId) return;
    const clamp = (n: number) => Math.round(Math.min(100, Math.max(0, n)) * 100) / 100;
    if (Math.abs(drag.width) > 1) this.config[`${drag.target}_x`] = clamp(drag.x + (event.clientX - drag.startX) / drag.width * 100);
    if (Math.abs(drag.height) > 1) this.config[`${drag.target}_y`] = clamp(drag.y + (event.clientY - drag.startY) / drag.height * 100);
  }

  @HostListener('window:pointerup')
  @HostListener('window:pointercancel')
  finalizarArrastre(): void {
    if (this.drag?.element.hasPointerCapture(this.drag.id)) this.drag.element.releasePointerCapture(this.drag.id);
    this.drag = null;
  }
}
