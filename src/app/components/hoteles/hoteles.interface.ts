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
    todoIncluido:         string;
    ubicacion:            string;
    descuento:            number | string;
}
