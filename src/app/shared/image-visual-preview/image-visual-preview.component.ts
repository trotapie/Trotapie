import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { estiloEncuadreImagen } from 'app/core/encuadre-imagen';
import { ConfiguracionFondo, nuevaConfiguracionFondo } from 'app/core/imagen-fondo-visual';
import { ImageFramingDirective } from 'app/shared/directives/image-framing.directive';
import { ImageTextPanelComponent } from 'app/shared/image-text-panel/image-text-panel.component';

export type ElementoVisual = 'imagen' | 'titulo' | 'descripcion' | 'etiqueta';

/** The same rendering surface is used in the editor, device preview and home carousel. */
@Component({
  selector: 'app-image-visual-preview',
  standalone: true,
  imports: [CommonModule, ImageFramingDirective, ImageTextPanelComponent],
  template: `
    <div class="visual-stage" [class.visual-stage--text-only]="!showMedia" [class.editable]="editable" [class.text-draggable]="allowTextDrag">
      @if (showMedia) {
      @if (url) {
        <img tpImageFraming [src]="url" [alt]="titulo" draggable="false" [ngStyle]="imageStyle"
          (error)="failed = true" (load)="failed = false" (pointerdown)="start($event, 'imagen')" />
      }
      @if (!url || failed) {
        <div class="placeholder" role="status">{{ failed ? 'No se pudo cargar la imagen. Revisa la URL.' : 'Agrega una URL para ver la imagen.' }}</div>
      }
      <div class="veil" [style.background-color]="veilColor"></div>
      }
      @if (showText) {
      @for (texto of textos; track texto) {
        @if (texto === 'titulo' ? titulo : descripcion) {
          <div class="text-block" [ngStyle]="position(texto)" (pointerdown)="start($event, texto)">
            <app-image-text-panel [presentacion]="config[texto + '_presentacion']">
              <p [class.title]="texto === 'titulo'" [style.color]="config[texto + '_color']"
                [style.--size]="config[texto + '_font_size']">{{ texto === 'titulo' ? titulo : descripcion }}</p>
            </app-image-text-panel>
          </div>
        }
      }
      @if (etiqueta) {
        <div class="text-block tag" [ngStyle]="position('etiqueta')" (pointerdown)="start($event, 'etiqueta')">
          <span [style.background-color]="config.etiqueta_color" [style.--size]="config.etiqueta_font_size">{{ etiqueta }}</span>
        </div>
      }
      }
    </div>
  `,
  styles: `
    :host { display:block; position:absolute; inset:0; }
    .visual-stage { position:relative; width:100%; height:100%; overflow:hidden; container-type:inline-size; background:#1e293b; }
    .visual-stage--text-only { background:transparent; }
    img { user-select:none; }
    .veil { position:absolute; inset:0; pointer-events:none; }
    .text-block { position:absolute; max-width:90%; width:max-content; padding:8px; z-index:1; }
    p { margin:0; white-space:pre-wrap; overflow-wrap:anywhere; line-height:1.25; font-size:clamp(10px, calc(var(--size) * 1cqw / 6), 72px); }
    .title { font-weight:800; }
    app-image-text-panel { max-width:100%; }
    .tag span { display:block; border-radius:999px; padding:6px 12px; font-weight:700; color:#0f172a; overflow-wrap:anywhere; font-size:clamp(8px, calc(var(--size) * 1cqw / 6), 32px); }
    .editable img, .editable .text-block { cursor:grab; touch-action:none; }
    .editable.text-draggable .text-block:hover { outline:1px dashed #fff; }
    .editable:not(.text-draggable) .text-block { cursor:default; touch-action:auto; }
    .placeholder { position:absolute; inset:0; display:grid; place-content:center; padding:24px; text-align:center; color:#e2e8f0; font-size:14px; }
  `
})
export class ImageVisualPreviewComponent {
  @Input() url = '';
  @Input() titulo = '';
  @Input() descripcion = '';
  @Input() etiqueta = '';
  @Input() config: ConfiguracionFondo = nuevaConfiguracionFondo();
  @Input() editable = false;
  @Input() allowTextDrag = true;
  @Input() showMedia = true;
  @Input() showText = true;
  @Output() dragStart = new EventEmitter<{ event: PointerEvent; target: ElementoVisual }>();
  readonly textos = ['titulo', 'descripcion'] as const;
  failed = false;

  get imageStyle(): Record<string, string> {
    return { ...estiloEncuadreImagen(this.config, this.config.efecto_activo && this.config.blur_px > 0),
      filter: this.config.efecto_activo ? `blur(${this.config.blur_px}px)` : 'none' };
  }

  get veilColor(): string {
    if (!this.config.oscurecer_fondo || !this.config.efecto_activo) return 'transparent';
    const hex = this.config.overlay_color.slice(1);
    return `rgba(${parseInt(hex.slice(0, 2), 16)},${parseInt(hex.slice(2, 4), 16)},${parseInt(hex.slice(4, 6), 16)},${this.config.overlay_opacidad})`;
  }

  position(target: Exclude<ElementoVisual, 'imagen'>): Record<string, string> {
    const x = this.config[`${target}_x`];
    const y = this.config[`${target}_y`];
    return { left: `${x}%`, top: `${y}%`, transform: `translate(${-x}%, ${-y}%)` };
  }

  start(event: PointerEvent, target: ElementoVisual): void {
    if (target !== 'imagen' && !this.allowTextDrag) return;
    if (this.editable) { event.preventDefault(); event.stopPropagation(); this.dragStart.emit({ event, target }); }
  }
}
