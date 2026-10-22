import { normalizarConfiguracionFondo, nuevaConfiguracionFondo } from './imagen-fondo-visual';

describe('Configuración visual del carrusel de inicio', () => {
  it('conserva la presentación anterior en imágenes sin configuración', () => {
    const config = normalizarConfiguracionFondo(null);
    expect(config.imagen_zoom).toBe(1);
    expect(config.imagen_x).toBe(50);
    expect(config.titulo_color).toBe('#F7BE07');
    expect(config.overlay_opacidad).toBe(0.4);
    expect(config.titulo_presentacion.oscurecer_fondo).toBeFalse();
  });

  it('limita zoom, posiciones, tamaños y efectos a rangos seguros', () => {
    const config = normalizarConfiguracionFondo({ imagen_zoom: 99, imagen_x: -20, titulo_y: 300,
      titulo_font_size: -9, overlay_opacidad: 4, blur_px: 999, overlay_color: 'red', titulo_color: 'invalid' });
    expect(config.imagen_zoom).toBe(3);
    expect(config.imagen_x).toBe(0);
    expect(config.titulo_y).toBe(100);
    expect(config.titulo_font_size).toBe(12);
    expect(config.overlay_opacidad).toBe(1);
    expect(config.blur_px).toBe(24);
    expect(config.overlay_color).toBe('#000000');
    expect(config.titulo_color).toBe('#FFFFFF');
  });

  it('no comparte referencias editables con los datos persistidos', () => {
    const original = nuevaConfiguracionFondo();
    original.descripciones.es = 'Original';
    const draft = normalizarConfiguracionFondo(original);
    draft.descripciones.es = 'Cambio';
    draft.titulo_presentacion.blur_px = 12;
    expect(original.descripciones.es).toBe('Original');
    expect(original.titulo_presentacion.blur_px).toBe(0);
  });

  it('conserva los ajustes independientes de cada texto al recargar', () => {
    const original = nuevaConfiguracionFondo();
    original.descripcion_x = 75;
    original.titulo_presentacion.oscurecer_fondo = true;
    const config = normalizarConfiguracionFondo(JSON.parse(JSON.stringify(original)));
    expect(config.descripcion_x).toBe(75);
    expect(config.titulo_presentacion.oscurecer_fondo).toBeTrue();
    expect(config.descripcion_presentacion.oscurecer_fondo).toBeFalse();
  });
});
