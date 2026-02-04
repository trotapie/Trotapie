export interface ICotizacion {
    id:                number;
    public_id:         string;
    fecha_creacion:    Date;
    noches:            number;
    habitaciones:      Habitaciones;
    fecha_entrada:     Date;
    fecha_salida:      Date;
    idioma:            string;
    precio_cotizacion: null;
    tipo_habitacion:   null;
    cliente_nombre:    string;
    cliente_email:     string;
    cliente_telefono:  number;
    nombre_hotel:      string;
    fondo:             string;
    estrellas:         number;
    ubicacion:         string;
    imagenes:          Imagene[];
    destino_nombre:    string;
    tipo_destino:      string;
    empleado_nombre:   string;
    estatus:           string;
}

export interface Habitaciones {
    es:         string;
    traduccion: string;
}

export interface Imagene {
    id:             number;
    url:            string;
    tipo_clave:     null;
    descripcion:    null;
    tipo_imagen_id: null;
}

export interface IEstatusCotizacion {
    id:     number;
    clave:  string;
    nombre: string;
    activo: boolean;
    orden:  number;
}

