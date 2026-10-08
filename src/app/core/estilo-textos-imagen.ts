export type TextoImagen = 'titulo' | 'descripcion';

export interface PresentacionTextoImagen {
  oscurecer_fondo: boolean;
  efecto_activo: boolean;
  overlay_color: string;
  overlay_opacidad: number;
  blur_px: number;
}

export const PRESENTACION_TEXTO_PREDETERMINADA: Readonly<PresentacionTextoImagen> = {
  oscurecer_fondo: false,
  efecto_activo: false,
  overlay_color: '#0F172A',
  overlay_opacidad: 0,
  blur_px: 0
};

export interface EstiloTextosImagen {
  titulo_color?: string | null;
  descripcion_color?: string | null;
  titulo_posicion?: string | null;
  titulo_x?: number | null;
  titulo_y?: number | null;
  descripcion_posicion?: string | null;
  descripcion_x?: number | null;
  descripcion_y?: number | null;
  titulo_presentacion?: PresentacionTextoImagen | null;
  descripcion_presentacion?: PresentacionTextoImagen | null;
  contenido_panel_espaciado?: boolean | null;
}

/** Null positions retain the original grouped layout until a text is moved. */
export function normalizarEstiloTextosImagen(imagen: EstiloTextosImagen & {
  texto_color?: string | null;
  oscurecer_fondo?: boolean;
  efecto_destino?: string;
  overlay_color?: string;
  overlay_opacidad?: number;
  blur_px?: number;
} = {}) {
  const color = (valor: string | null | undefined) => /^#[0-9a-f]{6}$/i.test(valor ?? '')
    ? valor! : /^#[0-9a-f]{6}$/i.test(imagen.texto_color ?? '') ? imagen.texto_color! : '#FFFFFF';
  const posicion = (valor: string | null | undefined) =>
    /^(top-left|top-center|top-right|center-left|center|center-right|bottom-left|bottom-center|bottom-right|custom)$/.test(valor ?? '')
      ? valor! : null;
  const coordenada = (valor: number | null | undefined) => valor == null || !Number.isFinite(Number(valor))
    ? null : Math.round(Math.min(100, Math.max(0, Number(valor))) * 100) / 100;
  const numero = (valor: number | undefined, max: number) => valor == null || !Number.isFinite(Number(valor))
    ? 0 : Math.min(max, Math.max(0, Number(valor)));
  const presentacion = (valor: PresentacionTextoImagen | null | undefined): PresentacionTextoImagen => {
    // Capture the previous shared settings once; future changes are independent.
    const anterior = {
      oscurecer_fondo: Boolean(imagen.oscurecer_fondo),
      efecto_activo: imagen.efecto_destino === 'texto' || imagen.efecto_destino === 'ambos',
      overlay_color: imagen.overlay_color,
      overlay_opacidad: imagen.overlay_opacidad,
      blur_px: imagen.blur_px
    };
    const origen = valor ?? anterior;
    return {
      oscurecer_fondo: Boolean(origen.oscurecer_fondo),
      efecto_activo: Boolean(origen.efecto_activo),
      overlay_color: /^#[0-9a-f]{6}$/i.test(origen.overlay_color ?? '') ? origen.overlay_color! : '#0F172A',
      overlay_opacidad: numero(origen.overlay_opacidad, 1),
      blur_px: numero(origen.blur_px, 24)
    };
  };
  return {
    titulo_color: color(imagen.titulo_color),
    descripcion_color: color(imagen.descripcion_color),
    titulo_posicion: posicion(imagen.titulo_posicion),
    titulo_x: coordenada(imagen.titulo_x),
    titulo_y: coordenada(imagen.titulo_y),
    descripcion_posicion: posicion(imagen.descripcion_posicion),
    descripcion_x: coordenada(imagen.descripcion_x),
    descripcion_y: coordenada(imagen.descripcion_y),
    titulo_presentacion: presentacion(imagen.titulo_presentacion),
    descripcion_presentacion: presentacion(imagen.descripcion_presentacion),
    // Keep the existing text layout stable when the image's effects are edited.
    contenido_panel_espaciado: imagen.contenido_panel_espaciado
      ?? (Boolean(imagen.oscurecer_fondo) || imagen.efecto_destino === 'texto' || imagen.efecto_destino === 'ambos')
  };
}
