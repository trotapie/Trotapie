export interface IHoteles {
    ciudad:  string;
    hoteles: Hotel[];
}

export interface Hotel {
    nombre:      string;
    descripcion: string;
    imagenes:    string[];
    id:          string;
}
