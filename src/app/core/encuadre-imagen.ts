export interface EncuadreImagen {
  imagen_zoom?: number | null;
  imagen_x?: number | null;
  imagen_y?: number | null;
}

export const ENCUADRE_IMAGEN_PREDETERMINADO = {
  imagen_zoom: 1,
  imagen_x: 50,
  imagen_y: 50
} as const;

export function normalizarEncuadreImagen(imagen: EncuadreImagen = {}) {
  const numero = (valor: number | null | undefined, min: number, max: number, defecto: number) =>
    valor == null || !Number.isFinite(Number(valor)) ? defecto : Math.min(max, Math.max(min, Number(valor)));
  return {
    imagen_zoom: numero(imagen.imagen_zoom, 0.1, 3, 1),
    imagen_x: numero(imagen.imagen_x, 0, 100, 50),
    imagen_y: numero(imagen.imagen_y, 0, 100, 50)
  };
}

/** Keep background framing independent from all text and label overlays. */
export function estiloEncuadreImagen(imagen: EncuadreImagen = {}, ampliarPorBlur = false): Record<string, string> {
  const encuadre = normalizarEncuadreImagen(imagen);
  const posicion = `${encuadre.imagen_x}% ${encuadre.imagen_y}%`;
  return {
    position: 'absolute',
    maxWidth: 'none',
    maxHeight: 'none',
    left: `${encuadre.imagen_x}%`,
    top: `${encuadre.imagen_y}%`,
    objectPosition: posicion,
    transformOrigin: posicion,
    transform: `translate(${-encuadre.imagen_x}%, ${-encuadre.imagen_y}%) scale(${encuadre.imagen_zoom * (ampliarPorBlur ? 1.05 : 1)})`
  };
}
