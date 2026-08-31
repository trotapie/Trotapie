export interface IDetallesDestino {
    catalogo_destino_id:     number;
    nombre:                  string;
    detalle_id:              number;
    ubicacion:               string;
    detalle:                 Detalle;
    datos_rapidos:           DatosRapido[];
    atracciones_principales: AtraccionesPrincipale[];
}

export interface AtraccionesPrincipale {
  id:           number;
  imagen_fondo?: string;
  imagenes?: Array<{
    imagen_url: string;
    nombre: string;
    descripcion: string;
    activa?: boolean;
    oscurecer_fondo?: boolean;
    texto_color?: string;
    titulo_font_size?: number;
    descripcion_font_size?: number;
    overlay_color?: string;
    overlay_opacidad?: number;
    blur_px?: number;
    efecto_destino?: 'fondo' | 'texto' | 'ambos';
    etiqueta_font_size?: number;
    etiqueta_color?: string;
    etiqueta_texto?: string | null;
    overlay_posicion?: string;
    overlay_x?: number | null;
    overlay_y?: number | null;
  }>;
}

export interface DatosRapido {
    clave:   string;
    icono:   string;
    label:   string;
    orden:   number;
    valor:   string;
    tipo_id: number;
}

export interface Detalle {
    apodo:              string;
    idioma:             string;
    nombre:             string;
    descripcion_corta:  string;
    descripcion_larga:  string;
    titulo_descripcion: string;
}
