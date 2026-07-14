export interface IDetallesDestino {
    destino_id:              number;
    nombre:                  string;
    detalle_id:              number;
    ubicacion:               string;
    detalle:                 Detalle;
    datos_rapidos:           DatosRapido[];
    atracciones_principales: AtraccionesPrincipale[];
}

export interface AtraccionesPrincipale {
  id:           number;
  nombre:       string;
  descripcion:  string;
  imagen_fondo?: string;
  imagenes?:    Array<{ imagen_url: string; activa?: boolean; oscurecer_fondo?: boolean }>;
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
