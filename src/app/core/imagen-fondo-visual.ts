import { normalizarEstiloTextosImagen } from './estilo-textos-imagen';

export const POSICIONES_IMAGEN = [
  { value: 'top-left', label: 'Arriba a la izquierda', x: 4, y: 4 },
  { value: 'top-center', label: 'Arriba al centro', x: 50, y: 4 },
  { value: 'top-right', label: 'Arriba a la derecha', x: 96, y: 4 },
  { value: 'center-left', label: 'Centro a la izquierda', x: 4, y: 50 },
  { value: 'center', label: 'Centro', x: 50, y: 50 },
  { value: 'center-right', label: 'Centro a la derecha', x: 96, y: 50 },
  { value: 'bottom-left', label: 'Abajo a la izquierda', x: 4, y: 96 },
  { value: 'bottom-center', label: 'Abajo al centro', x: 50, y: 96 },
  { value: 'bottom-right', label: 'Abajo a la derecha', x: 96, y: 96 }
] as const;

export function nuevaConfiguracionFondo() {
  return {
    ...normalizarEstiloTextosImagen(),
    titulo_color: '#F7BE07', titulo_font_size: 30, titulo_x: 50, titulo_y: 96,
    descripcion_font_size: 18, descripcion_x: 50, descripcion_y: 85,
    etiqueta_texto: '', etiqueta_color: '#F9B44B', etiqueta_font_size: 12,
    etiqueta_x: 50, etiqueta_y: 75,
    oscurecer_fondo: true, overlay_color: '#000000', overlay_opacidad: 0.4,
    blur_px: 0, efecto_activo: true,
    descripciones: {} as Record<string, string>,
    etiquetas: {} as Record<string, string>
  };
}

export type ConfiguracionFondo = ReturnType<typeof nuevaConfiguracionFondo>;

/** Validate persisted JSON before it reaches either the editor or public styles. */
export function normalizarConfiguracionFondo(valor: Partial<ConfiguracionFondo> | null = {}): ConfiguracionFondo {
  const base = nuevaConfiguracionFondo();
  const origen = valor ?? {};
  const numero = (n: unknown, min: number, max: number, fallback: number) =>
    n == null || !Number.isFinite(Number(n)) ? fallback : Math.min(max, Math.max(min, Number(n)));
  const color = (v: unknown, fallback: string) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
  const textos = (v: unknown): Record<string, string> => v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v).filter(([k, t]) => /^[a-z]{2}$/.test(k) && typeof t === 'string')) : {};
  const result = {
    ...base, ...normalizarEstiloTextosImagen({ ...base, ...origen }),
    titulo_font_size: numero(origen.titulo_font_size, 12, 72, base.titulo_font_size),
    descripcion_font_size: numero(origen.descripcion_font_size, 10, 40, base.descripcion_font_size),
    etiqueta_font_size: numero(origen.etiqueta_font_size, 8, 32, base.etiqueta_font_size),
    etiqueta_texto: typeof origen.etiqueta_texto === 'string' ? origen.etiqueta_texto : '',
    etiqueta_color: color(origen.etiqueta_color, base.etiqueta_color),
    overlay_color: color(origen.overlay_color, base.overlay_color),
    overlay_opacidad: numero(origen.overlay_opacidad, 0, 1, base.overlay_opacidad),
    blur_px: numero(origen.blur_px, 0, 24, 0),
    efecto_activo: typeof origen.efecto_activo === 'boolean' ? origen.efecto_activo : true,
    oscurecer_fondo: typeof origen.oscurecer_fondo === 'boolean' ? origen.oscurecer_fondo : true,
    descripciones: textos(origen.descripciones), etiquetas: textos(origen.etiquetas),
    titulo_x: numero(origen.titulo_x, 0, 100, base.titulo_x),
    titulo_y: numero(origen.titulo_y, 0, 100, base.titulo_y),
    descripcion_x: numero(origen.descripcion_x, 0, 100, base.descripcion_x),
    descripcion_y: numero(origen.descripcion_y, 0, 100, base.descripcion_y),
    etiqueta_x: numero(origen.etiqueta_x, 0, 100, base.etiqueta_x),
    etiqueta_y: numero(origen.etiqueta_y, 0, 100, base.etiqueta_y)
  };
  return result;
}
