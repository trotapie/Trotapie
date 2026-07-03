export interface Circuito {
  id?: number;
  nombre: string;
  descripcion: string;
  precio_total: number;
  duracion_dias: number;
  duracion_noches: number;
  activo: boolean;
  imagen_principal: string;
  created_at?: string;
  updated_at?: string;
  traducciones?: CircuitoTraduccion[];
  destinos?: CircuitoDestino[];
  hoteles?: CircuitoHotel[];
  actividades?: CircuitoActividad[];
  imagenes?: CircuitoImagen[];
}

export interface CircuitoTraduccion {
  idioma_id: number;
  nombre: string;
  descripcion: string;
}

export interface CircuitoDestino {
  id?: number;
  destino_id: number;
  destino_nombre?: string;
  orden: number;
  dias: number;
  noches: number;
}

export interface CircuitoHotel {
  id?: number;
  hotel_id: number;
  hotel_nombre?: string;
  noche: number;
  regimen_id: number | null;
}

export interface CircuitoActividad {
  id?: number;
  actividad_id: number;
  actividad_nombre?: string;
  dia: number;
  orden: number;
}

export interface CircuitoImagen {
  id?: number;
  imagen_url: string;
  orden: number;
  activa: boolean;
}
