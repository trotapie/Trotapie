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
        public_id: payload?.public_id ?? null
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

    return this.enriquecerCotizacionConIcono(data?.[0] ?? null);
    // TODO: AGREGAR LA IMAGEN DE FONDO DEL DESTINO Y TRAERLA  Y AL TRAER LA INFO MOSTRAR LA DESCRIPCION,
    // TAMBIEN TRAER EL REGIMEN QUE SE SELECCIONO
  }

  async obtenerCotizacionPorPublicIdCliente(publicId: string) {
    const { data, error } = await this.client.rpc(
      'obtener_cotizacion_por_public_id_cliente',
      { p_public_id: publicId }
    );
    if (error) throw error;

    return this.enriquecerCotizacionConIcono(data?.[0] ?? null);
    // TODO: AGREGAR LA IMAGEN DE FONDO DEL DESTINO Y TRAERLA  Y AL TRAER LA INFO MOSTRAR LA DESCRIPCION,
    // TAMBIEN TRAER EL REGIMEN QUE SE SELECCIONO
  }

  private async enriquecerCotizacionConIcono(cotizacion: any) {
    if (!cotizacion) {
      return null;
    }

    const iconoExistente =
      cotizacion?.icono ??
      cotizacion?.concepto?.icono ??
      cotizacion?.descuento?.icono ??
      cotizacion?.hotel?.concepto?.icono ??
      cotizacion?.hotel?.descuento?.icono ??
      cotizacion?.cotizacion_multiple?.[0]?.icono ??
      cotizacion?.cotizacion_multiple?.[0]?.hotel?.concepto?.icono ??
      cotizacion?.cotizacion_multiple?.[0]?.hotel?.descuento?.icono ??
      null;

    if (String(iconoExistente ?? '').trim()) {
      return {
        ...cotizacion,
        icono: iconoExistente
      };
    }

    const hotelIdCrudo =
      cotizacion?.hotel_id ??
      cotizacion?.hotelId ??
      cotizacion?.cotizacion_multiple?.[0]?.hotel_id ??
      cotizacion?.cotizacion_multiple?.[0]?.hotelId ??
      null;
    const hotelId = Number(hotelIdCrudo);

    const actividadesBase = Array.isArray(cotizacion?.actividades) ? cotizacion.actividades : [];
    const actividadIds = actividadesBase
      .map((item: any) => Number(item?.id))
      .filter((id: number) => Number.isFinite(id) && id > 0);

    let iconosActividades = new Map<number, string | null>();
    if (actividadIds.length) {
      try {
        const { data: actividadesData, error: actividadesError } = await this.client
          .from('actividades')
          .select('id, icono')
          .in('id', actividadIds);

        if (!actividadesError) {
          iconosActividades = new Map<number, string | null>(
            (actividadesData ?? []).map((item: any) => [Number(item.id), item.icono ?? null])
          );
        }
      } catch {
        // Si falla el enriquecimiento, dejamos el payload original.
      }
    }

    if (!Number.isFinite(hotelId) || hotelId <= 0) {
      return {
        ...cotizacion,
        actividades: actividadesBase.map((item: any) => ({
          ...item,
          icono: item?.icono ?? iconosActividades.get(Number(item?.id)) ?? null
        }))
      };
    }

    try {
      const idiomaCodigo = String(cotizacion?.idioma ?? 'es').trim().toLowerCase() || 'es';
      const idiomaId = await this.supabase.getIdiomaId(idiomaCodigo);

      const { data, error } = await this.client
        .from('hoteles')
        .select(`
          concepto:concepto_id ( icono ),
          descuento:descuento_id ( icono ),
          actividades:actividades_hotel!actividades_hotel_hotel_id_fkey (
            actividad:actividades!actividades_hotel_actividad_id_fkey (
              id,
              icono,
              descripcion,
              traducciones:actividades_traducciones (
                idioma_id,
                descripcion
              )
            )
          )
        `)
        .eq('id', hotelId)
        .maybeSingle();

      if (error) {
        return cotizacion;
      }

      const hotelRelacion = data as any;
      const actividades = (hotelRelacion?.actividades ?? [])
        .map((item: any) => {
          const actividad = item?.actividad ?? null;
          const traduccion = actividad?.traducciones?.find((t: any) => t.idioma_id === idiomaId);
          const descripcion = String(traduccion?.descripcion ?? actividad?.descripcion ?? '').trim();

          if (!descripcion) {
            return null;
          }

          return {
            id: Number(actividad?.id),
            descripcion,
            icono: actividad?.icono ?? null
          };
        })
        .filter(Boolean);

      return {
        ...cotizacion,
        icono: hotelRelacion?.concepto?.icono ?? hotelRelacion?.descuento?.icono ?? cotizacion?.icono ?? null,
        actividades: (actividades.length ? actividades : actividadesBase).map((item: any) => ({
          ...item,
          icono: item?.icono ?? iconosActividades.get(Number(item?.id)) ?? null
        }))
      };
    } catch {
      return {
        ...cotizacion,
        actividades: actividadesBase.map((item: any) => ({
          ...item,
          icono: item?.icono ?? iconosActividades.get(Number(item?.id)) ?? null
        }))
      };
    }
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
