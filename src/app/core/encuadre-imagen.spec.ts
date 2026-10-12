import { estiloEncuadreImagen, normalizarEncuadreImagen } from './encuadre-imagen';
import { normalizarEstiloTextosImagen } from './estilo-textos-imagen';

describe('Encuadre de imagen', () => {
  it('conserva el encuadre original para imágenes anteriores sin configuración', () => {
    expect(normalizarEncuadreImagen()).toEqual({ imagen_zoom: 1, imagen_x: 50, imagen_y: 50 });
    expect(estiloEncuadreImagen().transform).toBe('scale(1)');
  });

  it('limita valores inválidos antes de guardar o renderizar', () => {
    expect(normalizarEncuadreImagen({ imagen_zoom: Infinity, imagen_x: -20, imagen_y: 120 }))
      .toEqual({ imagen_zoom: 1, imagen_x: 0, imagen_y: 100 });
    expect(normalizarEncuadreImagen({ imagen_zoom: 9 }).imagen_zoom).toBe(3);
    expect(normalizarEncuadreImagen({ imagen_zoom: 0 }).imagen_zoom).toBe(0.1);
  });

  it('conserva zoom y posición al normalizar los datos para guardado y lectura', () => {
    const imagen = { imagen_zoom: 0.5, imagen_x: 15, imagen_y: 80, titulo_x: 30, titulo_y: 40 };
    const guardada = normalizarEstiloTextosImagen(imagen);
    const leida = normalizarEstiloTextosImagen(guardada);
    expect(normalizarEncuadreImagen(leida)).toEqual({ imagen_zoom: 0.5, imagen_x: 15, imagen_y: 80 });
    expect(estiloEncuadreImagen(leida).transform).toBe('scale(0.5)');
    expect(leida.titulo_x).toBe(30);
    expect(leida.titulo_y).toBe(40);
  });

  it('combina el zoom con el margen del desenfoque sin perder la posición', () => {
    const estilo = estiloEncuadreImagen({ imagen_zoom: 2, imagen_x: 20, imagen_y: 70 }, true);
    expect(estilo.transform).toBe('scale(2.1)');
    expect(estilo.objectPosition).toBe('20% 70%');
    expect(estilo.transformOrigin).toBe('20% 70%');
  });
});
