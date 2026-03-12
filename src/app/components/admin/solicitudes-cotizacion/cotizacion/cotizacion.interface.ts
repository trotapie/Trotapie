export interface ICotizacion {
    id: number;
    public_id: string;
    fecha_creacion: Date;
    noches: number;
    habitaciones: Habitaciones;
    fecha_entrada: Date;
    fecha_salida: Date;
    idioma: string;
    precio_cotizacion: null;
    tipo_habitacion: null;
    cliente_nombre: string;
    cliente_email: string;
    cliente_telefono: number;
    nombre_hotel: string;
    fondo: string;
    estrellas: number;
    ubicacion: string;
    imagenes: Imagene[];
    destino_nombre: string;
    tipo_destino: string;
    empleado_nombre: string;
    estatus: string;
    precios: PreciosYCondiciones[];
    politicas_tarifas: PoliticasTarifas;
    porcentaje_meses: number;
    porcentaje_seguro: number;
    fecha_limite_meses: string;
    fecha_limite_seguro: string;
}

export interface Habitaciones {
    es: string;
    traduccion: string;
}

export interface Imagene {
    id: number;
    url: string;
    tipo_clave: null;
    descripcion: null;
    tipo_imagen_id: null;
}

export interface IEstatusCotizacion {
    id: number;
    clave: string;
    nombre: string;
    activo: boolean;
    orden: number;
}

export interface PreciosYCondiciones {
    tipo: Tipo;
    precio: number;
    porcentaje: number;
    condiciones: Condicione[];
    id: number;
}

export interface Condicione {
    id: number;
    titulo: string;
    aplica_a: Tipo[];
    descripcion: string;
    tipoPoliticas: string;
}

export enum Tipo {
    AMeses = "a_meses",
    ConSeguro = "con_seguro",
    SinSeguro = "sin_seguro",
}

export interface PoliticasTarifas {
    apartado: PoliticaHotel[];
    noReembolsable: PoliticaHotel[];
}

export interface PoliticaHotel {
  id: number;
  titulo: string;
  descripcion: string;
  tipoPoliticas?: string;
}

export enum TarifaClave {
    Apartado = "apartado",
    NoReembolsable = "no_reembolsable",
}

export enum TarifaNombre {
    PrecioDeApartado = "Precio - De Apartado",
    PrecioTarifaNoReembolsable = "Precio - Tarifa no reembolsable",
}


