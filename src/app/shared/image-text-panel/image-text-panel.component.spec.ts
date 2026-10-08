import { TestBed } from '@angular/core/testing';
import { PRESENTACION_TEXTO_PREDETERMINADA } from 'app/core/estilo-textos-imagen';
import { ImageTextPanelComponent } from './image-text-panel.component';

describe('Panel individual de texto de imagen', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [ImageTextPanelComponent] }));

  it('renderiza color, opacidad y difuminado propios sin activar otro panel', () => {
    const titulo = TestBed.createComponent(ImageTextPanelComponent);
    const descripcion = TestBed.createComponent(ImageTextPanelComponent);
    titulo.componentRef.setInput('presentacion', {
      ...PRESENTACION_TEXTO_PREDETERMINADA, efecto_activo: true, overlay_color: '#FFAA00', overlay_opacidad: 0.5, blur_px: 8
    });
    descripcion.componentRef.setInput('presentacion', { ...PRESENTACION_TEXTO_PREDETERMINADA });
    titulo.detectChanges();
    descripcion.detectChanges();
    const panel = titulo.nativeElement.querySelector('.panel') as HTMLDivElement;
    expect(panel.style.backgroundColor).toBe('rgba(255, 170, 0, 0.5)');
    expect(panel.style.getPropertyValue('backdrop-filter')).toBe('blur(8px)');
    expect(descripcion.nativeElement.querySelector('.panel')).toBeNull();
  });

  it('mantiene el panel translúcido aunque el velo esté desactivado', () => {
    const fixture = TestBed.createComponent(ImageTextPanelComponent);
    fixture.componentRef.setInput('presentacion', { ...PRESENTACION_TEXTO_PREDETERMINADA, oscurecer_fondo: true });
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('.panel') as HTMLDivElement;
    expect(panel.classList.contains('panel--glass')).toBeTrue();
    expect(panel.style.getPropertyValue('backdrop-filter')).toContain('blur(12px)');
    fixture.componentRef.setInput('presentacion', { ...PRESENTACION_TEXTO_PREDETERMINADA });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.panel')).toBeNull();
  });
});
