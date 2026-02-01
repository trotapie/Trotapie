export interface IHoteles {
    ciudad: string;
    hoteles: Hotel[];
}

export interface IHoteles {
    ciudad: string;
    hoteles: Hotel[];
}
export interface Destinos { id: number; nombre: string }
export interface Descuento { id: number; tipo_descuento: string }

export interface Hotel {
    id: number;
    created_at: Date;              
    nombre_hotel: string;
    descripcion: string | null;
    estrellas: number | null;
    fondo: string | null;
    orden: number | null;
    ubicacion: string | null;
    destinos: Destinos | null;   
    descuento: Descuento | null; 
}

export interface DescripcionHotel {
    descripcion: string;
    resultadoActividades: string[];
    estrellas: number;
    resultadoRegimen: string[];
    ubicacion: string;
    descuento: number | string;
}

export interface ICoordenadas {
    lat: number;
    lng: number;
}
export interface Destinos {
    id: number;
    nombre: string;
    orden: number;
    continente?: any;
}

export interface IDetalleHotel {
    id: number;
    nombre_hotel: string;
    descripcion: string;
    ubicacion: null;
    imagenes: Imagenes[];
    regimenes: any[],
    actividades: any[];
    destino: any;
}

export interface Imagenes {
    url_imagen: string;
    tipo_imagen_id: number;
}


export interface IAsesores {
    id: number;
    nombre: string;
}

export interface IContinente {
    id: number;
    nombre: string;
}

export interface HotelConDestino {
    id: number;
    created_at: string;
    nombre_hotel: string;
    descripcion: string;
    estrellas: number;
    fondo: string;
    orden: number;
    ubicacion: string;
    destinos: {
        id: number;
        nombre: string;             
        destino_padre_id: number;
        destino_padre?: {
            id: number;
            nombre: string;          
        };
    };
    descuento: {
        id: number;
        tipo_descuento: string;
    } | null;
    concepto: {
        id: number;
        descripcion: string;
    } | null;
    regimen: {
        id: number;
        descripcion: string;
    } | null;
    _descuentoClase?: string;
}


export interface GrupoDestino {
  destino: string;
  hoteles: HotelConDestino[];
}

export interface IActividades {
    id:          number;
    descripcion: string;
    traducciones: IActividadTraduccion[];
}

export interface IActividadTraduccion {
    idioma_id:        number;
    descripcion:   string;
}


