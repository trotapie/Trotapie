import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { PRESENTACION_TEXTO_PREDETERMINADA, PresentacionTextoImagen } from 'app/core/estilo-textos-imagen';

/** A separate backdrop for each image text, shared by the editor and public carousel. */
@Component({
  selector: 'app-image-text-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (presentacion.efecto_activo || presentacion.oscurecer_fondo) {
      <div class="panel" aria-hidden="true"
        [class.panel--glass]="presentacion.oscurecer_fondo"
        [style.background-color]="colorFondo"
        [style.backdrop-filter]="filtroFondo"
        [style.-webkit-backdrop-filter]="filtroFondo"></div>
    }
    <div class="content"><ng-content></ng-content></div>
  `,
  styles: `
    :host { display: block; position: relative; width: max-content; }
    .content { position: relative; display: flow-root; }
    .panel { position: absolute; inset: -0.5rem; border-radius: 0.75rem; pointer-events: none; }
    .panel--glass { border: 1px solid rgb(255 255 255 / 20%); box-shadow: 0 8px 24px rgb(15 23 42 / 12%); }
  `
})
export class ImageTextPanelComponent {
  @Input() presentacion: PresentacionTextoImagen = PRESENTACION_TEXTO_PREDETERMINADA;

  get colorFondo(): string {
    if (!this.presentacion.efecto_activo) return 'rgb(255 255 255 / 12%)';
    const hex = this.presentacion.overlay_color.slice(1);
    return `rgba(${parseInt(hex.slice(0, 2), 16)}, ${parseInt(hex.slice(2, 4), 16)}, ${parseInt(hex.slice(4, 6), 16)}, ${this.presentacion.overlay_opacidad})`;
  }

  get filtroFondo(): string {
    const blur = this.presentacion.efecto_activo ? this.presentacion.blur_px : 12;
    return `blur(${blur}px)${this.presentacion.oscurecer_fondo ? ' saturate(1.5)' : ''}`;
  }
}
