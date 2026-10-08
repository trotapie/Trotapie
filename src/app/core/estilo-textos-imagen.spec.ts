import { normalizarEstiloTextosImagen, PRESENTACION_TEXTO_PREDETERMINADA } from './estilo-textos-imagen';

describe('Estilos independientes de textos de imagen', () => {
  it('hereda los efectos anteriores en dos configuraciones independientes', () => {
    const estilo = normalizarEstiloTextosImagen({
      oscurecer_fondo: true, efecto_destino: 'texto', overlay_color: '#123456', overlay_opacidad: 0.4, blur_px: 6
    });
    expect(estilo.titulo_presentacion).toEqual({
      oscurecer_fondo: true, efecto_activo: true, overlay_color: '#123456', overlay_opacidad: 0.4, blur_px: 6
    });
    expect(estilo.descripcion_presentacion).toEqual(estilo.titulo_presentacion);
    estilo.titulo_presentacion.blur_px = 18;
    expect(estilo.descripcion_presentacion.blur_px).toBe(6);
  });

  it('cambiar el efecto de la imagen no sobrescribe los paneles de texto guardados', () => {
    const estilo = normalizarEstiloTextosImagen({
      efecto_destino: 'ambos', overlay_color: '#ABCDEF', overlay_opacidad: 0.7, blur_px: 14,
      titulo_presentacion: { ...PRESENTACION_TEXTO_PREDETERMINADA, efecto_activo: true, overlay_color: '#FFAA00', blur_px: 3 },
      descripcion_presentacion: { ...PRESENTACION_TEXTO_PREDETERMINADA }
    });
    expect(estilo.titulo_presentacion.overlay_color).toBe('#FFAA00');
    expect(estilo.titulo_presentacion.blur_px).toBe(3);
    expect(estilo.descripcion_presentacion).toEqual(PRESENTACION_TEXTO_PREDETERMINADA);
    expect(normalizarEstiloTextosImagen(estilo)).toEqual(estilo);
  });

  it('normaliza los límites del velo y difuminado de cada panel', () => {
    const estilo = normalizarEstiloTextosImagen({ titulo_presentacion: {
      ...PRESENTACION_TEXTO_PREDETERMINADA, overlay_color: 'invalid', overlay_opacidad: 2, blur_px: -10
    } });
    expect(estilo.titulo_presentacion.overlay_color).toBe('#0F172A');
    expect(estilo.titulo_presentacion.overlay_opacidad).toBe(1);
    expect(estilo.titulo_presentacion.blur_px).toBe(0);
    expect(estilo.descripcion_presentacion).toEqual(PRESENTACION_TEXTO_PREDETERMINADA);
  });

  it('cambiar efectos de la imagen conserva el espaciado anterior del texto', () => {
    const estilo = normalizarEstiloTextosImagen({ efecto_destino: 'texto' });
    expect(estilo.contenido_panel_espaciado).toBeTrue();
    expect(normalizarEstiloTextosImagen({ ...estilo, efecto_destino: 'fondo' }).contenido_panel_espaciado).toBeTrue();
    const sinPanel = normalizarEstiloTextosImagen({ efecto_destino: 'fondo' });
    expect(normalizarEstiloTextosImagen({ ...sinPanel, efecto_destino: 'texto' }).contenido_panel_espaciado).toBeFalse();
  });

  it('conserva el color y el diseño agrupado de imágenes anteriores', () => {
    const estilo = normalizarEstiloTextosImagen({ texto_color: '#123456' });
    expect(estilo.titulo_color).toBe('#123456');
    expect(estilo.descripcion_color).toBe('#123456');
    expect(estilo.titulo_posicion).toBeNull();
    expect(estilo.descripcion_posicion).toBeNull();
    expect(estilo.titulo_x).toBeNull();
    expect(estilo.descripcion_y).toBeNull();
  });

  it('mantiene colores y coordenadas diferentes después de normalizar el guardado', () => {
    const estilo = normalizarEstiloTextosImagen({
      titulo_color: '#FFAA00', descripcion_color: '#00AAFF',
      titulo_posicion: 'custom', titulo_x: 21.72, titulo_y: 40.5,
      descripcion_posicion: 'custom', descripcion_x: 60.2, descripcion_y: 70.2
    });
    expect(estilo.titulo_color).toBe('#FFAA00');
    expect(estilo.descripcion_color).toBe('#00AAFF');
    expect(estilo.titulo_x).toBe(21.72);
    expect(estilo.titulo_y).toBe(40.5);
    expect(estilo.descripcion_x).toBe(60.2);
    expect(estilo.descripcion_y).toBe(70.2);
    expect(normalizarEstiloTextosImagen(estilo)).toEqual(estilo);
  });

  it('mover un título no crea una posición independiente para la descripción', () => {
    const estilo = normalizarEstiloTextosImagen({ titulo_posicion: 'custom', titulo_x: 10, titulo_y: 20 });
    expect(estilo.titulo_posicion).toBe('custom');
    expect(estilo.descripcion_posicion).toBeNull();
    expect(estilo.descripcion_x).toBeNull();
    expect(estilo.descripcion_y).toBeNull();
  });

  it('normaliza valores inválidos antes de enviarlos a los campos restringidos', () => {
    const estilo = normalizarEstiloTextosImagen({
      texto_color: '#123456', titulo_color: 'invalid', descripcion_color: '#ABCDEF',
      titulo_posicion: 'invalid', titulo_x: -10, titulo_y: 120,
      descripcion_x: NaN, descripcion_y: 12.3456
    });
    expect(estilo.titulo_color).toBe('#123456');
    expect(estilo.descripcion_color).toBe('#ABCDEF');
    expect(estilo.titulo_posicion).toBeNull();
    expect(estilo.titulo_x).toBe(0);
    expect(estilo.titulo_y).toBe(100);
    expect(estilo.descripcion_x).toBeNull();
    expect(estilo.descripcion_y).toBe(12.35);
  });
});
