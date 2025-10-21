export interface IHoteles {
    ciudad:  string;
    hoteles: Hotel[];
}

export interface IHoteles {
  ciudad:  string;
  hoteles: Hotel[];
}
export interface Destinos { id: number; nombre: string }
export interface Descuento { id: number; tipo_descuento: string }

export interface Hotel {
  id:           number;
  created_at:   Date;              // <- lo convertimos abajo
  nombre_hotel: string;
  descripcion:  string | null;
  estrellas:    number | null;
  fondo:        string | null;
  orden:        number | null;
  ubicacion:    string | null;
  destinos:     Destinos | null;   // <- objeto
  descuento:    Descuento | null;  // <- objeto (siempre puedes dejarlo null)
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
export interface Destinos {
    id:     number;
    nombre: string;
    orden: number
}

export interface IDetalleHotel {
    id:           number;
    nombre_hotel: string;
    descripcion:  string;
    ubicacion:    null;
    imagenes:     Imagenes[];
    regimenes:    any[]
}

export interface Imagenes {
    url_imagen: string;
}


export interface IAsesores {
    id:     number;
    nombre: string;
}


