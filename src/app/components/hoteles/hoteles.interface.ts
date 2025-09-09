export interface IHoteles {
    ciudad:  string;
    hoteles: Hotel[];
}

export interface Hotel {
    nombre:          string;
    descripcion:     DescripcionHotel;
    fondo:           null | string;
    imagenes:        string[];
    id:              string;
}

export interface DescripcionHotel {
    descripcion:          string;
    resultadoActividades: string[];
    estrellas:            number;
    resultadoRegimen:         string[];
    ubicacion:            string;
    descuento:            number | string;
}

export interface ICoordenadas {
    lat: number;
    lng: number;
}
