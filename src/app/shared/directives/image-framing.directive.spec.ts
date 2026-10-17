import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ImageFramingDirective } from './image-framing.directive';

@Component({
  standalone: true,
  imports: [ImageFramingDirective],
  template: '<div><img tpImageFraming alt="Prueba"></div>'
})
class TestHostComponent {}

describe('ImageFramingDirective', () => {
  function createImage(width: number, height: number) {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    const element = fixture.debugElement.query(By.directive(ImageFramingDirective));
    const image = element.nativeElement as HTMLImageElement;
    Object.defineProperties(image, {
      naturalWidth: { value: width, configurable: true },
      naturalHeight: { value: height, configurable: true }
    });
    Object.defineProperties(image.parentElement!, {
      clientWidth: { value: 720, configurable: true },
      clientHeight: { value: 300, configurable: true }
    });
    image.dispatchEvent(new Event('load'));
    return { fixture, image, directive: element.injector.get(ImageFramingDirective) };
  }

  it('conserva toda la altura de una fotografía vertical antes de aplicar zoom', () => {
    const { image } = createImage(600, 1200);
    expect(image.style.width).toBe('720px');
    expect(image.style.height).toBe('1440px');
    // At 20% zoom the complete photo fits: 144 × 288, not a scaled 720 × 300 crop.
    expect(parseFloat(image.style.height) * 0.2).toBe(288);
  });

  it('conserva el ancho completo de una fotografía panorámica', () => {
    const { image } = createImage(2400, 600);
    expect(image.style.width).toBe('1200px');
    expect(image.style.height).toBe('300px');
  });

  it('recalcula las dimensiones al cambiar de marco o imagen', () => {
    const { image, directive } = createImage(600, 1200);
    Object.defineProperty(image.parentElement!, 'clientWidth', { value: 360 });
    directive.updateSize();
    expect(image.style.width).toBe('360px');
    expect(image.style.height).toBe('720px');
    Object.defineProperties(image, {
      naturalWidth: { value: 1200 },
      naturalHeight: { value: 600 }
    });
    image.dispatchEvent(new Event('load'));
    expect(image.style.width).toBe('600px');
    expect(image.style.height).toBe('300px');
  });
});
