export interface IHoteles {
    ciudad:  string;
    hoteles: Hotel[];
}

export interface Hotel {
    nombre:      string;
    descripcion: any;
    imagenes:    string[];
    id:          string;
}
