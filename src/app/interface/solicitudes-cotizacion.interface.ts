export interface ISolicitudCotizacionListado {
  id: number;
  public_id?: string;
  fecha_creacion?: string | Date;
  cliente_nombre: string;
  cliente_email: string;
  cliente_telefono: number;
  hotel_nombre: string;
  destino_nombre: string;
  tipo_destino: string;
  empleado_nombre: string;
  estatus_nombre: string;
}
