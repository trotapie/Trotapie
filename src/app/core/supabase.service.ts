import { inject, Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { getDefaultLang } from 'app/lang.utils';
import { TranslocoService } from '@jsverse/transloco';
import { Observable } from 'rxjs';
import { ISolicitudCotizacionListado } from 'app/interface/solicitudes-cotizacion.interface';

const ES_ID = 1;

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private client: SupabaseClient;
  private transloco = inject(TranslocoService);

  constructor() {
    this.client = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }

  // ✅ agrega esto dentro de SupabaseService
  getClient(): SupabaseClient {
    return this.client;
  }

  // ===== AUTH =====
  getSession() { return this.client.auth.getSession(); }
  onAuth(cb: Parameters<SupabaseClient['auth']['onAuthStateChange']>[0]) {
    return this.client.auth.onAuthStateChange(cb);
  }

  signUp(email: string, password: string) {
    return this.client.auth.signUp({ email, password });
  }

  signIn(email: string, password: string) {
    return this.client.auth.signInWithPassword({ email, password }); // v2
  }

  signOut() { return this.client.auth.signOut(); }

  // ===== DB (PostgREST) =====

  async listHotelesAll(destinoId: number, lang?: string) {
    const idiomaId = await this.getIdiomaId(lang);

    const { data, error } = await this.client
      .from('hoteles')
      .select(`
    id, created_at, estrellas, fondo, orden, ubicacion,

    traducciones:hotel_traducciones (
      idioma_id,
      nombre_hotel,
      descripcion
    ),

    descuento:descuento_id (
      id,
      icono,
      traducciones:descuentos_traducciones (
        idioma_id,
        descripcion
      )
    ),

    destinos:destino_id!inner ( id, nombre, tipo_desino_id ),
    concepto:concepto_id ( id, descripcion, icono ),

    regimen:regimen_id (
      id,
      traducciones:regimen_traducciones (
        idioma_id,
        descripcion
      )
    )
  `)
      .eq('destinos.id', destinoId)
      .order('orden', { ascending: true });


    if (error) throw error;

    const hotelesUI = (data ?? []).map((h: any) => {

      const t = h.traducciones?.find((x: any) => x.idioma_id === idiomaId);
      const tEs = h.traducciones?.find((x: any) => x.idioma_id === ES_ID);

      const regT = h.regimen?.traducciones?.find((x: any) => x.idioma_id === idiomaId);
      const regEs = h.regimen?.traducciones?.find((x: any) => x.idioma_id === ES_ID);

      const descT = h.descuento?.traducciones?.find((x: any) => x.idioma_id === idiomaId);
      const descEs = h.descuento?.traducciones?.find((x: any) => x.idioma_id === ES_ID);

      return {
        ...h,
        nombre_hotel: t?.nombre_hotel ?? tEs?.nombre_hotel ?? '',
        descripcion: t?.descripcion ?? tEs?.descripcion ?? '',

        regimen: h.regimen
          ? { ...h.regimen, descripcion: regT?.descripcion ?? '' }
          : null,

        descuento: h.descuento
          ? { ...h.descuento, tipo_descuento: descT?.descripcion ?? '' }
          : null,
      };
    });

    return hotelesUI;
  }

  async listHotelesAllPorDestinoPadre(idDestinoPadre: number, lang?: string) {
    const idiomaId = await this.getIdiomaId(lang);

    const { data, error } = await this.client
      .from('hoteles')
      .select(`
      id, created_at, estrellas, fondo, orden, ubicacion,

      traducciones:hotel_traducciones (
        idioma_id,
        nombre_hotel,
        descripcion
      ),

      descuento:descuento_id (
        id,
        icono,
        traducciones:descuentos_traducciones (
          idioma_id,
          descripcion
        )
      ),

      destinos:destino_id!inner (
        id,
        nombre,
        tipo_desino_id,
        destino_padre_id,
        destino_padre:destino_padre_id ( nombre ),
        imagen_destino
      ),

      concepto:concepto_id ( id, descripcion, icono ),

      regimen:regimen_id (
        id,
        traducciones:regimen_traducciones (
          idioma_id,
          descripcion
        )
      )
    `)
      .eq('destinos.destino_padre_id', idDestinoPadre)
      .order('orden', { ascending: true });

    if (error) throw error;

    const hotelesUI = (data ?? []).map((h: any) => {

      const t = h.traducciones?.find((x: any) => x.idioma_id === idiomaId);
      const tEs = h.traducciones?.find((x: any) => x.idioma_id === ES_ID);

      const regT = h.regimen?.traducciones?.find((x: any) => x.idioma_id === idiomaId);
      const regEs = h.regimen?.traducciones?.find((x: any) => x.idioma_id === ES_ID);

      const descT = h.descuento?.traducciones?.find((x: any) => x.idioma_id === idiomaId);
      const descEs = h.descuento?.traducciones?.find((x: any) => x.idioma_id === ES_ID);

      return {
        ...h,

        nombre_hotel: t?.nombre_hotel ?? '',
        regimen: h.regimen
          ? { ...h.regimen, descripcion: regT?.descripcion ?? '' }
          : null,

        descuento: h.descuento
          ? { ...h.descuento, tipo_descuento: descT?.descripcion ?? '' }
          : null,
      };
    });

    return hotelesUI;
  }

  async infoHotel(idHotel: number, lang?: string) {
    const idiomaId = await this.getIdiomaId(lang);

    const { data, error } = await this.client
      .from('hoteles')
      .select(`
    id,
    ubicacion,
    fondo,
    estrellas,
    orden,
    destino_id,
    descuento_id,
    concepto_id,
    regimen_id,
    
    destino:destinos!hoteles_destino_id_fkey (
    id,
    nombre
  ),

    traducciones:hotel_traducciones!hotel_traducciones_hotel_id_fkey (
      idioma_id,
      nombre_hotel,
      descripcion
    ),

    imagenes:imagenes_hoteles!imagenes_hoteles_hotel_id_fkey (
      id,
      url_imagen,
      tipo_imagen_id,

      tipo:tipos_imagen!imagenes_hoteles_tipo_imagen_id_fkey (
        id,
        clave
      )
    ),

    actividades:actividades_hotel!actividades_hotel_hotel_id_fkey (
      actividad:actividades!actividades_hotel_actividad_id_fkey (
        id,
        descripcion,
        traducciones:actividades_traducciones (
          idioma_id,
          descripcion
        )
      )
    ),

    regimenes:regimen_hotel!regimen_hotel_hotel_id_fkey (
      regimen:regimen!regimen_hotel_regimen_id_fkey (
        id,
        traducciones:regimen_traducciones (
          idioma_id,
          descripcion
        )
      )
    )
  `)
      .eq('id', idHotel)
      .maybeSingle();


    if (error) throw error;
    if (!data) return null;

    const actividadesTraducidas = (data?.actividades)
      .map((x: any) => {
        const act = x.actividad;
        const tLang = act?.traducciones?.find(
          (t: any) => t.idioma_id === idiomaId
        );

        if (!tLang?.descripcion) return '';

        return {
          id: act.id,
          descripcion: tLang.descripcion,
        };
      })
      .filter(Boolean);


    const tLang = data.traducciones?.find((t: any) => t.idioma_id === idiomaId);

    const tEs = data.traducciones?.find((t: any) => t.idioma_id === 1);

    const traducida = tLang ?? null;

    const regimenesTraducidos = (data?.regimenes ?? []).flatMap((x: any) => {
      const r = x.regimen;
      const tLang = r?.traducciones?.find((t: any) => t.idioma_id === idiomaId);

      const tEs = r?.traducciones?.find(
        (t: any) => t.idioma_id === 1
      );
      return tLang?.descripcion
        ? [{ id: r.id, descripcion: tLang.descripcion, es: tEs?.descripcion }]
        : [];
    });

    const datos = {
      ...data,
      nombre_hotel: traducida?.nombre_hotel ?? tEs?.nombre_hotel,
      descripcion: traducida?.descripcion ?? this.transloco.translate('sin-descripcion'),
      actividades: actividadesTraducidas,
      regimenes: regimenesTraducidos
    };

    return datos;
  }

  empleados() {
    return this.client
      .from('empleados')
      .select('*')
      .order('id', { ascending: true });
  }

  continentes() {
    return this.client
      .from('continentes')
      .select('*')
      .order('id', { ascending: true });
  }

  obtenerDestinos(id: number) {
    return this.client
      .from('destinos')
      .select('id, nombre, orden, imagen_destino,  continente:continente_id ( id, nombre )')
      .eq('tipo_desino_id', id)
      .is('destino_padre_id', null)
      .order('orden', { ascending: true });
  }


  clientsRegister() {
    return this.client
      .from('clientes')
      .select('*')
  }

  async upsertCliente(cliente: {
    nombre: string;
    email: string | null;
    telefono: string;
    recibir_ofertas: boolean;
  }) {
    const { data, error } = await this.client
      .from('clientes')
      .upsert(cliente, { onConflict: 'telefono' })
      .select('id, nombre, email, telefono, recibir_ofertas')
      .single();

    if (error) throw error;
    return data; // <- { id, ... }
  }

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
      .select('id')
      .single();

    if (error) throw error;
    return data; // { id }
  }

  addHotel(payload: { nombre: string; ciudad: string; descripcion?: string }) {
    return this.client.from('hoteles').insert(payload).single();
  }

  // ===== REALTIME (DB changes) =====
  subscribeHotelesChanges(handler: (payload: any) => void) {
    const ch = this.client
      .channel('room:hoteles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hoteles' }, handler)
      .subscribe();
    return () => { this.client.removeChannel(ch); };
  }

  // ===== STORAGE =====
  uploadHotelImage(hotelId: string, file: File) {
    const path = `${hotelId}/${Date.now()}_${file.name}`;
    return this.client.storage.from('hoteles').upload(path, file);
  }

  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.client
      .storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  async getIdiomaId(codigo: string) {
    const { data, error } = await this.client
      .from('idiomas')
      .select('id')
      .eq('codigo', codigo)
      .maybeSingle();

    if (error) throw error;
    return data?.id ?? 1; // fallback a es=1 si no existe
  }

  async getImagenesFondo() {
    const { data, error } = await this.client
      .from('imagenes_fondo')
      .select('url_imagen')
      .eq('activo', true)
      .order('id', { ascending: true });
    const imagenes = data.map(img => img.url_imagen);
    if (error) throw error;
    return imagenes;
  }

  async obtenerTiposImagenHotel() {
    const { data, error } = await this.client
      .from('tipos_imagen')
      .select(`
    id,
    clave,
    traducciones:tipos_imagen_traducciones!fk_tipo_imagen (
      id,
      lang,
      descripcion
    )
  `)
      .order('id');

    return data;
  }

  // getImagenesFondo(): Observable<ImagenFondo[]> {
  // return from(
  //   this.supabase
  //     .from('imagenes_fondo')
  //     .select('id, url_imagen')
  //     .eq('activo', true)
  //     .order('id', { ascending: true })
  // ).pipe(
  //   map(({ data, error }) => {
  //     if (error) throw error;
  //     return data as ImagenFondo[];
  //   })
  // );
  // }

  async obtenerSolicitudesCotizacion() {
    const { data, error } = await this.client
      .rpc('obtener_solicitudes_cotizacion');

    if (error) throw error;
    return data as ISolicitudCotizacionListado[];
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

  async actualizarCotizacionPublicaCompleta(
    publicId: string,
    formValue: any
  ) {
    const limpiar = (v: any) => {
      if (v === null || v === undefined || v === '') return null;
      const n = Number(String(v).replace(/[$,\s]/g, ''));
      return Number.isFinite(n) ? n : null;
    };

    const tipoHabitacionId = formValue.tipoHabitacion?.id;
    const estatusClave = formValue.estatus;

    if (!tipoHabitacionId || !estatusClave) return;

    const { error } = await this.client.rpc('actualizar_cotizacion_publica', {
      p_public_id: publicId.trim(),
      p_precio: limpiar(formValue.precio),
      p_precio_con_seguro: limpiar(formValue.precioConSeguro),
      p_precio_a_meses: limpiar(formValue.precioMeses),
      p_tipo_habitacion: tipoHabitacionId,
      p_estatus_clave: estatusClave,
      p_condiciones_precio: formValue.condicionesPrecioSinSeguro ?? [],
      p_condiciones_precio_seguro: formValue.condicionesPrecioConSeguro ?? [],
      p_condiciones_precio_meses: formValue.condicionesPrecioMeses ?? [],
    });

    if (error) throw error;
  }

  async obtenerDetalleDestino(destinoId: number, lang?: string) {
    
    const { data, error } = await this.client.rpc('get_detalle_destino', {
      p_destino_id: destinoId,
      p_codigo: lang,
    });
    return data;
  }

}
