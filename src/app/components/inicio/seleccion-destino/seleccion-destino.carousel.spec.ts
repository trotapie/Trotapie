import { fakeAsync, tick } from '@angular/core/testing';
import { nuevaConfiguracionFondo } from 'app/core/imagen-fondo-visual';
import { SeleccionDestinoComponent } from './seleccion-destino.component';

describe('Transición del carrusel de inicio', () => {
  let component: SeleccionDestinoComponent;
  let image: HTMLImageElement;
  let imageConstructor: jasmine.Spy;

  beforeEach(() => {
    component = Object.create(SeleccionDestinoComponent.prototype);
    component.currentSlide = { id: 1, nombre_destino: 'Bangkok, Tailandia', url_imagen: 'https://example.com/1.jpg' };
    component.overlaySlide = null;
    component.isTransitioning = false;
    component.currentConfig = nuevaConfiguracionFondo();
    component.overlayConfig = nuevaConfiguracionFondo();
    component.imagenesFondo = [component.currentSlide,
      { id: 2, nombre_destino: 'Tokio, Japón', url_imagen: 'https://example.com/2.jpg', configuracion_visual: { titulo_color: '#FF0000' } }];
    image = {} as HTMLImageElement;
    imageConstructor = spyOn(window, 'Image').and.returnValue(image);
  });

  it('mantiene un único nombre antes, durante y después de la transición', fakeAsync(() => {
    const next = component.imagenesFondo[1];
    const currentConfig = component.currentConfig;
    component.cambiarFondoConTransicion(next.url_imagen, next.nombre_destino, next);
    expect(component.captionSlide?.id).toBe(1);
    expect(component.captionConfig).toBe(currentConfig);
    image.onload!.call(image, new Event('load'));
    expect(component.captionSlide?.id).toBe(2);
    expect(component.captionConfig.titulo_color).toBe('#FF0000');
    tick(500);
    expect(component.captionSlide?.id).toBe(2);
    expect(component.overlaySlide).toBeNull();
    expect(component.isTransitioning).toBeFalse();
  }));

  it('no inicia otra carga mientras la siguiente imagen está pendiente', fakeAsync(() => {
    const next = component.imagenesFondo[1];
    component.cambiarFondoConTransicion(next.url_imagen, next.nombre_destino, next);
    component.cambiarFondoConTransicion(next.url_imagen, next.nombre_destino, next);
    expect(imageConstructor).toHaveBeenCalledTimes(1);
    image.onload!.call(image, new Event('load'));
    tick(500);
  }));

  it('permite volver a intentar después de una imagen fallida', () => {
    const next = component.imagenesFondo[1];
    component.cambiarFondoConTransicion(next.url_imagen, next.nombre_destino, next);
    image.onerror!.call(image, new Event('error'));
    expect(component.captionSlide?.id).toBe(1);
    component.cambiarFondoConTransicion(next.url_imagen, next.nombre_destino, next);
    expect(imageConstructor).toHaveBeenCalledTimes(2);
  });

  it('cancela la transición al salir de la pantalla', fakeAsync(() => {
    const next = component.imagenesFondo[1];
    component.cambiarFondoConTransicion(next.url_imagen, next.nombre_destino, next);
    image.onload!.call(image, new Event('load'));
    component.ngOnDestroy();
    tick(500);
    expect(component.currentSlide?.id).toBe(1);
    component.cambiarFondoConTransicion(next.url_imagen, next.nombre_destino, next);
    expect(imageConstructor).toHaveBeenCalledTimes(1);
  }));
});
