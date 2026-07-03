import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ISolicitudCotizacionListado } from 'app/interface/solicitudes-cotizacion.interface';

@Injectable({ providedIn: 'root' })
export class CotizacionesService {
  private readonly supabase = inject(SupabaseService);

  private get client() { return this.supabase.getClient(); }

  async crearSolicitudCotizacion(payload: {
    cliente_id: number;
    hotel_id: number;
    empleado_id: number;
    idioma?: string | null;
    regimen_id?: number | null;
    fecha_entrada: string; // YYYY-MM-DD
    fecha_salida: string;  // YYYY-MM-DD
    noches: number;
    habitaciones: any;     // json
    peticiones_especiales?: string | null;
    recibir_ofertas: boolean;
    mensaje?: string | null;
  }) {
    const { data, error } = await this.client
      .from('solicitudes_cotizacion')
      .insert(payload)
      .select('id, public_id')
      .single();

    if (error) throw error;
    return data; // { id, public_id }
  }

  async guardarHotelesComparativaSolicitud(payload: Array<{
    solicitud_id: number;
    hotel_id: number;
    regimen_id: number | null;
    es_principal: boolean;
    orden: number;
  }>) {
    if (!payload?.length) return [];

    const { data, error } = await this.client
      .from('solicitud_cotizacion_hoteles')
      .insert(payload)
      .select('id, solicitud_id, hotel_id, regimen_id, es_principal, orden');

    if (error) throw error;
    return data ?? [];
  }

  async enviarCorreoCotizacion(payload: {
    to_email: string;
    to_name?: string | null;
    hotel_nombre?: string | null;
    asunto?: string | null;
    mensaje?: string | null;
    fecha_entrada?: string | Date | null;
    fecha_salida?: string | Date | null;
    noches?: number | null;
    telefono?: string | null;
    public_id?: string | null;
    pdf_base64?: string | null;
    pdf_filename?: string | null;
  }) {
    const toEmail = String(payload?.to_email ?? '').trim();
    if (!toEmail) {
      throw new Error('No hay email de destino.');
    }

    const { data, error } = await this.client.functions.invoke('enviar-correo', {
      body: {
        correo: toEmail,
        nombre: payload?.to_name ?? '',
        hotel: payload?.hotel_nombre ?? '',
        asunto: payload?.asunto ?? null,
        mensaje: payload?.mensaje ?? null,
        fecha_entrada: payload?.fecha_entrada ?? null,
        fecha_salida: payload?.fecha_salida ?? null,
        noches: payload?.noches ?? null,
        telefono: payload?.telefono ?? null,
        public_id: payload?.public_id ?? null,
        pdf_base64: payload?.pdf_base64 ?? null,
        pdf_filename: payload?.pdf_filename ?? null
      }
    });

    if (error) {
      throw new Error(error.message ?? 'No se pudo enviar la cotizacion por correo.');
    }

    if ((data as any)?.ok === false) {
      throw new Error((data as any)?.message ?? 'No se pudo enviar la cotizacion por correo.');
    }

    return data;
  }

  async obtenerSolicitudesCotizacion() {
    const { data, error } = await this.client
      .rpc('obtener_solicitudes_cotizacion');

    if (error) throw error;

    const solicitudes = (data ?? []) as ISolicitudCotizacionListado[];
    if (!solicitudes.length) {
      return solicitudes;
    }

    const ids = solicitudes
      .map((item) => Number(item.id))
      .filter((id) => Number.isFinite(id) && id > 0);

    if (!ids.length) {
      return solicitudes;
    }

    const { data: detalleHabitaciones, error: errorHabitaciones } = await this.client
      .from('solicitudes_cotizacion')
      .select('id, empleado_id, habitaciones, created_at')
      .in('id', ids);

    if (errorHabitaciones) throw errorHabitaciones;

    const habitacionesPorId = new Map<number, any>(
      (detalleHabitaciones ?? []).map((item: any) => [Number(item.id), item.habitaciones ?? null])
    );
    const empleadoPorId = new Map<number, number | null>(
      (detalleHabitaciones ?? []).map((item: any) => [
        Number(item.id),
        Number.isFinite(Number(item.empleado_id)) ? Number(item.empleado_id) : null,
      ])
    );
    const fechasPorId = new Map<number, string | Date | null>(
      (detalleHabitaciones ?? []).map((item: any) => [Number(item.id), item.created_at ?? null])
    );

    return solicitudes.map((item) => ({
      ...item,
      empleado_id: empleadoPorId.get(Number(item.id)) ?? (item as any).empleado_id ?? null,
      created_at: fechasPorId.get(Number(item.id)) ?? (item as any).created_at ?? null,
      fecha_creacion:
        (item as any).fecha_creacion ??
        fechasPorId.get(Number(item.id)) ??
        (item as any).created_at ??
        null,
      habitaciones: habitacionesPorId.get(Number(item.id)) ?? item.habitaciones ?? null
    }));
  }

  async obtenerCotizacionesMultiples() {
    const { data, error } = await this.client
      .rpc('obtener_cotizaciones_multiples');

    if (error) throw error;

    const cotizaciones = (data ?? []) as ISolicitudCotizacionListado[];
    if (!cotizaciones.length) {
      return cotizaciones;
    }

    const ids = cotizaciones
      .map((item) => Number(item.id))
      .filter((id) => Number.isFinite(id) && id > 0);

    if (!ids.length) {
      return cotizaciones;
    }

    const { data: detalleHabitaciones, error: errorHabitaciones } = await this.client
      .from('cotizaciones_multiples')
      .select('id, habitaciones, created_at')
      .in('id', ids);

    if (errorHabitaciones) throw errorHabitaciones;

    const habitacionesPorId = new Map<number, any>(
      (detalleHabitaciones ?? []).map((item: any) => [Number(item.id), item.habitaciones ?? null])
    );
    const fechasPorId = new Map<number, string | Date | null>(
      (detalleHabitaciones ?? []).map((item: any) => [Number(item.id), item.created_at ?? null])
    );

    return cotizaciones.map((item) => ({
      ...item,
      created_at: fechasPorId.get(Number(item.id)) ?? (item as any).created_at ?? null,
      fecha_creacion:
        (item as any).fecha_creacion ??
        fechasPorId.get(Number(item.id)) ??
        (item as any).created_at ??
        null,
      habitaciones: habitacionesPorId.get(Number(item.id)) ?? item.habitaciones ?? null
    }));
  }

  async obtenerCotizacionPorPublicId(publicId: string) {
    const { data, error } = await this.client.rpc(
      'obtener_cotizacion_por_public_id',
      { p_public_id: publicId }
    );
    if (error) throw error;

    return data?.[0] ?? null;
    // TODO: AGREGAR LA IMAGEN DE FONDO DEL DESTINO Y TRAERLA  Y AL TRAER LA INFO MOSTRAR LA DESCRIPCION,
    // TAMBIEN TRAER EL REGIMEN QUE SE SELECCIONO
  }

  async obtenerCotizacionPorPublicIdCliente(publicId: string) {
    const { data, error } = await this.client.rpc(
      'obtener_cotizacion_por_public_id_cliente',
      { p_public_id: publicId }
    );
    if (error) throw error;

    return data?.[0] ?? null;
    // TODO: AGREGAR LA IMAGEN DE FONDO DEL DESTINO Y TRAERLA  Y AL TRAER LA INFO MOSTRAR LA DESCRIPCION,
    // TAMBIEN TRAER EL REGIMEN QUE SE SELECCIONO
  }

  tipoHabitaciones() {
    return this.client
      .from('tipos_habitacion')
      .select('*')
  }

  estatusCotizaciones() {
    return this.client
      .from('estatus_cotizacion')
      .select('id, clave, nombre, activo, orden')
      .eq('activo', true); // 👈 ordenados
  }

  async actualizarCotizacionPublicaCompleta(publicId: string, formValue: any) {

    const limpiar = (v: any) => {
      if (!v) return null;
      const n = Number(String(v).replace(/[$,\s]/g, ''));
      return Number.isFinite(n) ? n : null;
    };

    const { error } = await this.client.rpc('actualizar_cotizacion_publica', {

      p_public_id: publicId.trim(),

      p_precio: limpiar(formValue.precio),
      p_precio_con_seguro: limpiar(formValue.precioConSeguro),
      p_precio_a_meses: limpiar(formValue.precioMeses),

      p_tipo_habitacion: formValue.tipoHabitacion?.id,
      p_estatus_clave: formValue.estatus ?? 'pendiente',

      p_condiciones_precio: formValue.condicionesPrecioSinSeguro ?? [],
      p_condiciones_precio_seguro: formValue.condicionesPrecioConSeguro ?? [],
      p_condiciones_precio_meses: formValue.condicionesPrecioMeses ?? [],

      p_porcentaje_seguro: formValue.porcentajeSeguro,
      p_porcentaje_meses: formValue.porcentajeMeses,

      p_fecha_limite_seguro: formValue.fechaLimiteSeguro,
      p_fecha_limite_meses: formValue.fechaLimiteMeses,
      p_cotizacion_multiple: formValue.cotizacionMultiple ?? null

    });

    if (error) throw error;
  }
}
