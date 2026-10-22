import { ImageVisualPreviewComponent } from './image-visual-preview.component';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

describe('ImageVisualPreviewComponent', () => {
  it('permite bloquear el arrastre del nombre sin bloquear la imagen', () => {
    const preview = new ImageVisualPreviewComponent();
    preview.editable = true;
    preview.allowTextDrag = false;
    const emit = spyOn(preview.dragStart, 'emit');
    const event = new PointerEvent('pointerdown');
    preview.start(event, 'titulo');
    expect(emit).not.toHaveBeenCalled();
    preview.start(event, 'imagen');
    expect(emit).toHaveBeenCalledTimes(1);
  });
  it('aplica el oscurecimiento configurado y permite quitarlo', () => {
    const preview = new ImageVisualPreviewComponent();
    expect(preview.veilColor).toBe('rgba(0,0,0,0.4)');
    preview.config.oscurecer_fondo = false;
    expect(preview.veilColor).toBe('transparent');
  });

  it('conserva las posiciones de texto al ampliar o difuminar la imagen', () => {
    const preview = new ImageVisualPreviewComponent();
    const posicion = preview.position('titulo');
    preview.config.imagen_zoom = 2;
    preview.config.blur_px = 10;
    expect(preview.position('titulo')).toEqual(posicion);
    expect(preview.imageStyle.filter).toBe('blur(10px)');
    expect(preview.imageStyle.transform).toContain('scale(2.1)');
  });
});

@Component({
  standalone: true,
  imports: [ImageVisualPreviewComponent],
  template: `
    <app-image-visual-preview titulo="Bangkok, Tailandia" [showText]="false" />
    <app-image-visual-preview titulo="Tokio, Japón" [showText]="false" />
    <app-image-visual-preview [titulo]="transitioning ? 'Tokio, Japón' : 'Bangkok, Tailandia'" [showMedia]="false" />
  `
})
class CarouselCaptionTestHost {
  transitioning = false;
}

describe('Nombre único durante el fundido del carrusel', () => {
  it('cambia el nombre sin mezclarlo con los textos de las dos capas de fondo', () => {
    const fixture = TestBed.createComponent(CarouselCaptionTestHost);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.text-block').length).toBe(1);
    expect(host.querySelector('.text-block')?.textContent).toBe('Bangkok, Tailandia');
    fixture.componentInstance.transitioning = true;
    fixture.detectChanges();
    expect(host.querySelectorAll('.text-block').length).toBe(1);
    expect(host.querySelector('.text-block')?.textContent).toBe('Tokio, Japón');
    const textLayer = host.querySelector('.visual-stage--text-only');
    expect(textLayer?.querySelector('.veil')).toBeNull();
    expect(textLayer?.querySelector('.placeholder')).toBeNull();
    fixture.destroy();
  });
});
