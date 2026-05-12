import { inject, Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { getDefaultLang } from 'app/lang.utils';
import { TranslocoService } from '@jsverse/transloco';
import { Observable } from 'rxjs';
import { ISolicitudCotizacionListado } from 'app/interface/solicitudes-cotizacion.interface';

const ES_ID = 1;
const CODIGOS_IDIOMA_PREVIEW = ['es', 'en', 'pt', 'de', 'fr'] as const;

export interface IIdiomaPreviewAdmin {
  id: number;
  codigo: string;
  nombre: string;
}

export interface ITraduccionPreviewAdmin {
  idioma_id: number;
  nombre: string;
  apodo: string;
  descripcion_corta: string;
  descripcion_larga: string;
  titulo_descripcion: string;
}

export interface IDetalleRapidoPreviewAdmin {
  id: number;
  tipo_dato_rapido_id: number;
  clave: string;
  nombre: string;
  icono: string | null;
  tipo_valor: string | null;
  orden: number | null;
  valores: Record<number, string>;
}

export interface IActividadPreviewAdmin {
  id: number | null;
  imagen_fondo: string;
  traducciones: Record<number, { nombre: string; descripcion: string }>;
}

export interface IPreviewDestinoAdmin {
  detalles_destinos_id: number | null;
  destino_id: number;
  destino_nombre: string;
  ubicacion: string;
  idiomas: IIdiomaPreviewAdmin[];
  traducciones: ITraduccionPreviewAdmin[];
  detalles_rapidos: IDetalleRapidoPreviewAdmin[];
  actividades: IActividadPreviewAdmin[];
  catalogo_tipos_dato_rapido: Array<{
    id: number;
    clave: string;
    nombre: string;
    icono: string | null;
    tipo_valor: string | null;
  }>;
}

export type CatalogoAdminKey =
  | 'actividades'
  | 'conceptos'
  | 'continentes'
  | 'descuentos'
  | 'idiomas'
  | 'politicas'
  | 'regimen_hotel'
  | 'tarifas'
  | 'tipo_imagen'
  | 'tipos_habitacion'
  | 'atracciones';

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

  async obtenerDestinoPorId(id: number) {
    const { data, error } = await this.client
      .from('destinos')
      .select('id, nombre, orden, tipo_desino_id, destino_padre_id, continente_id, imagen_destino, imagen_cotizacion')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async obtenerTiposDestinoAdmin() {
    const { data, error } = await this.client
      .from('tipo_destinos')
      .select('id, nombre')
      .order('id', { ascending: true });

    if (!error && data?.length) {
      return data;
    }

    const { data: destinos, error: errorDestinos } = await this.client
      .from('destinos')
      .select('tipo_desino_id')
      .not('tipo_desino_id', 'is', null);

    if (errorDestinos) throw errorDestinos;

    const idsUnicos = [...new Set((destinos ?? []).map((x: any) => x.tipo_desino_id))]
      .filter((id) => Number.isFinite(id))
      .sort((a, b) => a - b);

    return idsUnicos.map((id: number) => ({
      id,
      nombre: id === 1 ? 'NACIONAL' : id === 2 ? 'INTERNACIONAL' : `TIPO ${id}`
    }));
  }

  async obtenerDestinosPadreTipoDos(excluirId?: number) {
    let query = this.client
      .from('destinos')
      .select('id, nombre')
      .eq('tipo_desino_id', 2)
      .is('destino_padre_id', null)
      .order('nombre', { ascending: true });

    if (excluirId) {
      query = query.neq('id', excluirId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data ?? [];
  }

  async actualizarDestinoAdmin(
    id: number,
    payload: {
      nombre: string;
      orden: number | null;
      tipo_desino_id: number;
      destino_padre_id: number | null;
      continente_id: number | null;
      imagen_destino: string | null;
      imagen_cotizacion: string | null;
    }
  ) {
    const { data, error } = await this.client
      .from('destinos')
      .update(payload)
      .eq('id', id)
      .select('id')
      .single();

    if (error) throw error;
    return data;
  }

  async crearDestinoAdmin(
    payload: {
      nombre: string;
      orden: number | null;
      tipo_desino_id: number;
      destino_padre_id: number | null;
      continente_id: number | null;
      imagen_destino: string | null;
      imagen_cotizacion: string | null;
    }
  ) {
    const { data, error } = await this.client
      .from('destinos')
      .insert(payload)
      .select('id');

    if (error) throw error;
    return data;
  }

  async obtenerIdiomasPreviewAdmin() {
    const { data, error } = await this.client
      .from('idiomas')
      .select('id, codigo, nombre, orden')
      .order('orden', { ascending: true });

    if (error) throw error;

    const permitidos = new Set<string>(CODIGOS_IDIOMA_PREVIEW);
    return (data ?? [])
      .filter((item: any) => permitidos.has(String(item.codigo ?? '').toLowerCase()))
      .map((item: any) => ({
        id: item.id,
        codigo: String(item.codigo ?? '').toLowerCase(),
        nombre: item.nombre
      })) as IIdiomaPreviewAdmin[];
  }

  async obtenerPreviewDestinoAdmin(destinoId: number): Promise<IPreviewDestinoAdmin> {
    const [idiomas, destino] = await Promise.all([
      this.obtenerIdiomasPreviewAdmin(),
      this.obtenerDestinoPorId(destinoId)
    ]);

    if (!destino) {
      throw new Error('No se encontro el destino solicitado.');
    }

    const { data: detalle, error: detalleError } = await this.client
      .from('detalles_destinos')
      .select('id, ubicacion, destino_id')
      .eq('destino_id', destinoId)
      .maybeSingle();

    if (detalleError) throw detalleError;

    const idiomaIds = idiomas.map((x) => x.id);
    const detalleId = detalle?.id ?? null;
    const { data: catalogoTiposRaw, error: catalogoTiposError } = await this.client
      .from('tipo_dato_rapido')
      .select(`
        id,
        clave,
        icono,
        tipo_valor,
        traducciones:tipo_dato_rapido_traducciones (
          idioma_id,
          nombre
        )
      `)
      .order('id', { ascending: true });

    if (catalogoTiposError) throw catalogoTiposError;

    const { data: catalogoAtraccionesRaw, error: catalogoAtraccionesError } = await this.client
      .from('catalogo_atracciones')
      .select(`
        id,
        clave,
        traducciones:catalogo_atracciones_traducciones (
          idioma_id,
          nombre
        )
      `)
      .eq('activo', true)
      .order('orden', { ascending: true })
      .order('id', { ascending: true });

    if (catalogoAtraccionesError) throw catalogoAtraccionesError;

    const catalogoTipos = (catalogoTiposRaw ?? []).map((tipo: any) => ({
      id: tipo.id,
      clave: tipo.clave,
      icono: tipo.icono ?? null,
      tipo_valor: tipo.tipo_valor ?? null,
      nombre:
        tipo?.traducciones?.find((x: any) => x.idioma_id === ES_ID)?.nombre ??
        tipo?.traducciones?.[0]?.nombre ??
        tipo?.clave ??
        ''
    }));

    const catalogoAtracciones = (catalogoAtraccionesRaw ?? []).map((item: any) => ({
      id: Number(item.id),
      clave: item.clave ?? '',
      nombre:
        item?.traducciones?.find((x: any) => x.idioma_id === ES_ID)?.nombre ??
        item?.traducciones?.[0]?.nombre ??
        item?.clave ??
        ''
    }));

    let traducciones: any[] = [];
    let detallesRapidos: any[] = [];
    let detallesRapidosTraducciones: any[] = [];
    let actividades: any[] = [];
    let actividadesTraducciones: any[] = [];

    if (detalleId) {
      const [traduccionesResponse, detallesRapidosResponse] = await Promise.all([
        this.client
          .from('detalles_destinos_traducciones')
          .select('idioma_id, nombre, apodo, descripcion_corta, descripcion_larga, titulo_descripcion')
          .eq('detalles_destinos_id', detalleId)
          .in('idioma_id', idiomaIds),
        this.client
          .from('detalles_destinos_datos_rapidos')
          .select(`
            id,
            orden,
            tipo_dato_rapido_id,
            tipo:tipo_dato_rapido_id (
              id,
              clave,
              icono,
              tipo_valor,
              traducciones:tipo_dato_rapido_traducciones (
                idioma_id,
                nombre
              )
            )
          `)
          .eq('detalles_destinos_id', detalleId)
          .order('orden', { ascending: true })
      ]);

      if (traduccionesResponse.error) throw traduccionesResponse.error;
      if (detallesRapidosResponse.error) throw detallesRapidosResponse.error;

      traducciones = traduccionesResponse.data ?? [];
      detallesRapidos = detallesRapidosResponse.data ?? [];
      const detallesRapidosIds = detallesRapidos.map((item: any) => item.id);

      if (detallesRapidosIds.length) {
        const { data: dataDetallesRapidosTraducciones, error: detallesRapidosTraduccionesError } =
          await this.client
            .from('detalles_destinos_datos_rapidos_traducciones')
            .select('detalles_destinos_dato_rapido_id, idioma_id, valor')
            .in('detalles_destinos_dato_rapido_id', detallesRapidosIds)
            .in('idioma_id', idiomaIds);

        if (detallesRapidosTraduccionesError) throw detallesRapidosTraduccionesError;
        detallesRapidosTraducciones = dataDetallesRapidosTraducciones ?? [];
      }

      const { data: actividadesData, error: actividadesError } = await this.client
        .from('atracciones_principales')
        .select('id, imagen_fondo, detalles_destino_id')
        .eq('detalles_destino_id', detalleId)
        .order('id', { ascending: true });

      if (actividadesError) throw actividadesError;
      actividades = actividadesData ?? [];

      const actividadIds = actividades.map((item: any) => item.id);
      if (actividadIds.length) {
        const { data: actividadesTrData, error: actividadesTrError } = await this.client
          .from('atracciones_principales_traducciones')
          .select('atracciones_principales_id, idioma_id, nombre, descripcion')
          .in('atracciones_principales_id', actividadIds)
          .in('idioma_id', idiomaIds);

        if (actividadesTrError) throw actividadesTrError;
        actividadesTraducciones = actividadesTrData ?? [];
      }
    } else {
      detallesRapidos = catalogoTipos.map((tipo: any, index: number) => ({
        id: -(index + 1),
        orden: index + 1,
        tipo_dato_rapido_id: tipo.id,
        tipo: {
          ...tipo,
          traducciones: [{ idioma_id: ES_ID, nombre: tipo.nombre }]
        }
      }));
    }

    const traduccionesPorIdioma = new Map<number, any>();
    traducciones.forEach((item: any) => traduccionesPorIdioma.set(item.idioma_id, item));

    const datosPreview = idiomas.map((idioma) => {
      const traduccion = traduccionesPorIdioma.get(idioma.id);
      const nombreFallback = idioma.codigo === 'es' ? destino.nombre ?? '' : '';
      return {
        idioma_id: idioma.id,
        nombre: traduccion?.nombre ?? nombreFallback,
        apodo: traduccion?.apodo ?? '',
        descripcion_corta: traduccion?.descripcion_corta ?? '',
        descripcion_larga: traduccion?.descripcion_larga ?? '',
        titulo_descripcion: traduccion?.titulo_descripcion ?? ''
      };
    });

    const valoresPorDetalleRapido = new Map<number, Map<number, string>>();
    detallesRapidosTraducciones.forEach((item: any) => {
      if (!valoresPorDetalleRapido.has(item.detalles_destinos_dato_rapido_id)) {
        valoresPorDetalleRapido.set(item.detalles_destinos_dato_rapido_id, new Map<number, string>());
      }

      valoresPorDetalleRapido
        .get(item.detalles_destinos_dato_rapido_id)
        ?.set(item.idioma_id, item.valor ?? '');
    });

    const traduccionesActividadPorId = new Map<number, Map<number, { nombre: string; descripcion: string }>>();
    actividadesTraducciones.forEach((item: any) => {
      if (!traduccionesActividadPorId.has(item.atracciones_principales_id)) {
        traduccionesActividadPorId.set(item.atracciones_principales_id, new Map());
      }

      traduccionesActividadPorId
        .get(item.atracciones_principales_id)
        ?.set(item.idioma_id, {
          nombre: item.nombre ?? '',
          descripcion: item.descripcion ?? ''
        });
    });

    return {
      detalles_destinos_id: detalleId,
      destino_id: destinoId,
      destino_nombre: destino.nombre ?? '',
      ubicacion: detalle?.ubicacion ?? '',
      idiomas,
      traducciones: datosPreview,
      catalogo_tipos_dato_rapido: catalogoTipos,
      actividades: (actividades ?? []).map((actividad: any) => {
        const traduccionesActividad = traduccionesActividadPorId.get(actividad.id) ?? new Map();
        const recordTraducciones: Record<number, { nombre: string; descripcion: string }> = {};

        idiomas.forEach((idioma) => {
          recordTraducciones[idioma.id] = traduccionesActividad.get(idioma.id) ?? {
            nombre: '',
            descripcion: ''
          };
        });

        return {
          id: actividad.id,
          imagen_fondo: actividad.imagen_fondo ?? '',
          traducciones: recordTraducciones
        } as IActividadPreviewAdmin;
      }),
      detalles_rapidos: (detallesRapidos ?? []).map((item: any) => {
        const valores = valoresPorDetalleRapido.get(item.id) ?? new Map<number, string>();
        const recordValores: Record<number, string> = {};

        idiomas.forEach((idioma) => {
          recordValores[idioma.id] = valores.get(idioma.id) ?? '';
        });

        return {
          id: item.id,
          tipo_dato_rapido_id: item.tipo_dato_rapido_id,
          clave: item.tipo?.clave ?? '',
          nombre:
            item.tipo?.traducciones?.find((x: any) => x.idioma_id === ES_ID)?.nombre ??
            item.tipo?.traducciones?.[0]?.nombre ??
            item.tipo?.clave ??
            '',
          icono: item.tipo?.icono ?? null,
          tipo_valor: item.tipo?.tipo_valor ?? null,
          orden: item.orden ?? null,
          valores: recordValores
        } as IDetalleRapidoPreviewAdmin;
      })
    };
  }

  async guardarPreviewDestinoAdmin(payload: {
    destino_id: number;
    ubicacion: string | null;
    traducciones: Array<{
      idioma_id: number;
      nombre: string | null;
      apodo: string | null;
      descripcion_corta: string | null;
      descripcion_larga: string | null;
      titulo_descripcion: string | null;
    }>;
    detalles_rapidos: Array<{
      tipo_dato_rapido_id: number;
      orden: number | null;
      valores: Array<{
        idioma_id: number;
        valor: string | null;
      }>;
    }>;
    actividades: Array<{
      id: number | null;
      imagen_fondo: string | null;
      traducciones: Array<{
        idioma_id: number;
        nombre: string | null;
        descripcion: string | null;
      }>;
    }>;
  }) {
    const { data: detalleExistente, error: detalleExistenteError } = await this.client
      .from('detalles_destinos')
      .select('id')
      .eq('destino_id', payload.destino_id)
      .maybeSingle();

    if (detalleExistenteError) throw detalleExistenteError;

    let detallesDestinosId = detalleExistente?.id;

    if (detallesDestinosId) {
      const { error: actualizarDetalleError } = await this.client
        .from('detalles_destinos')
        .update({ ubicacion: payload.ubicacion })
        .eq('id', detallesDestinosId);

      if (actualizarDetalleError) throw actualizarDetalleError;
    } else {
      const { data: nuevoDetalle, error: crearDetalleError } = await this.client
        .from('detalles_destinos')
        .insert({
          destino_id: payload.destino_id,
          ubicacion: payload.ubicacion
        })
        .select('id')
        .single();

      if (crearDetalleError) throw crearDetalleError;
      detallesDestinosId = nuevoDetalle.id;
    }

    const traduccionesPayload = payload.traducciones.map((item) => ({
      detalles_destinos_id: detallesDestinosId,
      idioma_id: item.idioma_id,
      nombre: item.nombre,
      apodo: item.apodo,
      descripcion_corta: item.descripcion_corta,
      descripcion_larga: item.descripcion_larga,
      titulo_descripcion: item.titulo_descripcion
    }));

    const { error: traduccionesError } = await this.client
      .from('detalles_destinos_traducciones')
      .upsert(traduccionesPayload, { onConflict: 'detalles_destinos_id,idioma_id' });

    if (traduccionesError) throw traduccionesError;

    const { data: detallesRapidosExistentes, error: detallesRapidosExistentesError } = await this.client
      .from('detalles_destinos_datos_rapidos')
      .select('id, tipo_dato_rapido_id')
      .eq('detalles_destinos_id', detallesDestinosId);

    if (detallesRapidosExistentesError) throw detallesRapidosExistentesError;

    const mapaDetalleRapidoPorTipo = new Map<number, number>();
    (detallesRapidosExistentes ?? []).forEach((item: any) => {
      mapaDetalleRapidoPorTipo.set(item.tipo_dato_rapido_id, item.id);
    });

    const faltantes = payload.detalles_rapidos
      .filter((item) => !mapaDetalleRapidoPorTipo.has(item.tipo_dato_rapido_id))
      .map((item, index) => ({
        detalles_destinos_id: detallesDestinosId,
        tipo_dato_rapido_id: item.tipo_dato_rapido_id,
        orden: item.orden ?? index + 1
      }));

    if (faltantes.length) {
      const { data: insertados, error: insertadosError } = await this.client
        .from('detalles_destinos_datos_rapidos')
        .insert(faltantes)
        .select('id, tipo_dato_rapido_id');

      if (insertadosError) throw insertadosError;
      (insertados ?? []).forEach((item: any) => mapaDetalleRapidoPorTipo.set(item.tipo_dato_rapido_id, item.id));
    }

    await Promise.all(
      payload.detalles_rapidos.map((item, index) =>
        this.client
          .from('detalles_destinos_datos_rapidos')
          .update({ orden: item.orden ?? index + 1 })
          .eq('detalles_destinos_id', detallesDestinosId)
          .eq('tipo_dato_rapido_id', item.tipo_dato_rapido_id)
      )
    );

    const valoresPayload = payload.detalles_rapidos.flatMap((detalleRapido) => {
      const detalleRapidoId = mapaDetalleRapidoPorTipo.get(detalleRapido.tipo_dato_rapido_id);
      if (!detalleRapidoId) {
        return [];
      }

      return detalleRapido.valores.map((valor) => ({
        detalles_destinos_dato_rapido_id: detalleRapidoId,
        idioma_id: valor.idioma_id,
        valor: valor.valor
      }));
    });

    if (valoresPayload.length) {
      const { error: valoresError } = await this.client
        .from('detalles_destinos_datos_rapidos_traducciones')
        .upsert(valoresPayload, { onConflict: 'detalles_destinos_dato_rapido_id,idioma_id' });

      if (valoresError) throw valoresError;
    }

    const { data: actividadesExistentes, error: actividadesExistentesError } = await this.client
      .from('atracciones_principales')
      .select('id')
      .eq('detalles_destino_id', detallesDestinosId);

    if (actividadesExistentesError) throw actividadesExistentesError;

    const idsExistentes = new Set((actividadesExistentes ?? []).map((x: any) => Number(x.id)));
    const mapaActividadId = new Map<number, number>();

    for (let index = 0; index < payload.actividades.length; index++) {
      const actividad = payload.actividades[index];
      const idActividad = Number(actividad.id);

      if (idActividad && idsExistentes.has(idActividad)) {
        const { error: updateActividadError } = await this.client
          .from('atracciones_principales')
          .update({ imagen_fondo: actividad.imagen_fondo })
          .eq('id', idActividad)
          .eq('detalles_destino_id', detallesDestinosId);

        if (updateActividadError) throw updateActividadError;
        mapaActividadId.set(index, idActividad);
        continue;
      }

      const { data: nuevaActividad, error: crearActividadError } = await this.client
        .from('atracciones_principales')
        .insert({
          detalles_destino_id: detallesDestinosId,
          imagen_fondo: actividad.imagen_fondo
        })
        .select('id')
        .single();

      if (crearActividadError) throw crearActividadError;
      mapaActividadId.set(index, Number(nuevaActividad.id));
    }

    const traduccionesActividadesPayload = payload.actividades.flatMap((actividad, index) => {
      const actividadId = mapaActividadId.get(index);
      if (!actividadId) {
        return [];
      }

      return (actividad.traducciones ?? [])
        .filter((traduccion) => {
          const nombreLimpio = (traduccion.nombre ?? '').trim();
          return !!nombreLimpio;
        })
        .map((traduccion) => ({
          atracciones_principales_id: actividadId,
          idioma_id: traduccion.idioma_id,
          nombre: traduccion.nombre,
          descripcion: traduccion.descripcion
        }));
    });

    if (traduccionesActividadesPayload.length) {
      const { error: actividadesTraduccionesError } = await this.client
        .from('atracciones_principales_traducciones')
        .upsert(traduccionesActividadesPayload, { onConflict: 'atracciones_principales_id,idioma_id' });

      if (actividadesTraduccionesError) throw actividadesTraduccionesError;
    }

    for (let index = 0; index < payload.actividades.length; index++) {
      const actividad = payload.actividades[index];
      const actividadId = mapaActividadId.get(index);
      if (!actividadId) {
        continue;
      }

      const idiomasSinNombre = (actividad.traducciones ?? [])
        .filter((traduccion) => !((traduccion.nombre ?? '').trim()))
        .map((traduccion) => traduccion.idioma_id);

      if (!idiomasSinNombre.length) {
        continue;
      }

      const { error: borrarTraduccionesVaciasError } = await this.client
        .from('atracciones_principales_traducciones')
        .delete()
        .eq('atracciones_principales_id', actividadId)
        .in('idioma_id', idiomasSinNombre);

      if (borrarTraduccionesVaciasError) throw borrarTraduccionesVaciasError;
    }

    return { id: detallesDestinosId };
  }

  async actualizarOrdenDatosRapidosDestinoAdmin(
    destinoId: number,
    detallesRapidos: Array<{ tipo_dato_rapido_id: number; orden: number }>
  ) {
    const { data: detalle, error: detalleError } = await this.client
      .from('detalles_destinos')
      .select('id')
      .eq('destino_id', destinoId)
      .maybeSingle();

    if (detalleError) throw detalleError;
    if (!detalle?.id || !detallesRapidos.length) {
      return { updated: 0 };
    }

    const resultados = await Promise.all(
      detallesRapidos.map((item) =>
        this.client
          .from('detalles_destinos_datos_rapidos')
          .update({ orden: item.orden })
          .eq('detalles_destinos_id', detalle.id)
          .eq('tipo_dato_rapido_id', item.tipo_dato_rapido_id)
      )
    );

    const error = resultados.find((r) => r.error)?.error;
    if (error) throw error;

    return { updated: detallesRapidos.length };
  }

  async guardarActividadDestinoAdmin(payload: {
    destino_id: number;
    actividad_id?: number | null;
    imagen_fondo: string | null;
    traducciones: Array<{
      idioma_id: number;
      nombre: string | null;
      descripcion: string | null;
    }>;
  }) {
    const { data: detalleExistente, error: detalleExistenteError } = await this.client
      .from('detalles_destinos')
      .select('id')
      .eq('destino_id', payload.destino_id)
      .maybeSingle();

    if (detalleExistenteError) throw detalleExistenteError;

    let detallesDestinoId = detalleExistente?.id;
    if (!detallesDestinoId) {
      const { data: nuevoDetalle, error: crearDetalleError } = await this.client
        .from('detalles_destinos')
        .insert({
          destino_id: payload.destino_id,
          ubicacion: null
        })
        .select('id')
        .single();

      if (crearDetalleError) throw crearDetalleError;
      detallesDestinoId = nuevoDetalle.id;
    }

    let actividadId = payload.actividad_id ?? null;

    if (actividadId) {
      const { error: actualizarActividadError } = await this.client
        .from('atracciones_principales')
        .update({
          imagen_fondo: payload.imagen_fondo
        })
        .eq('id', actividadId)
        .eq('detalles_destino_id', detallesDestinoId);

      if (actualizarActividadError) throw actualizarActividadError;
    } else {
      const { data: nuevaActividad, error: crearActividadError } = await this.client
        .from('atracciones_principales')
        .insert({
          detalles_destino_id: detallesDestinoId,
          imagen_fondo: payload.imagen_fondo
        })
        .select('id')
        .single();

      if (crearActividadError) throw crearActividadError;
      actividadId = nuevaActividad.id;
    }

    const traduccionesPayload = payload.traducciones
      .filter((item) => {
        const nombreLimpio = (item.nombre ?? '').trim();
        return !!nombreLimpio;
      })
      .map((item) => ({
        atracciones_principales_id: actividadId,
        idioma_id: item.idioma_id,
        nombre: item.nombre,
        descripcion: item.descripcion
      }));

    if (traduccionesPayload.length) {
      const { error: traduccionesError } = await this.client
        .from('atracciones_principales_traducciones')
        .upsert(traduccionesPayload, {
          onConflict: 'atracciones_principales_id,idioma_id'
        });

      if (traduccionesError) throw traduccionesError;
    }

    const idiomasSinNombre = payload.traducciones
      .filter((item) => !((item.nombre ?? '').trim()))
      .map((item) => item.idioma_id);

    if (idiomasSinNombre.length) {
      const { error: borrarTraduccionesVaciasError } = await this.client
        .from('atracciones_principales_traducciones')
        .delete()
        .eq('atracciones_principales_id', actividadId)
        .in('idioma_id', idiomasSinNombre);

      if (borrarTraduccionesVaciasError) throw borrarTraduccionesVaciasError;
    }

    return { id: actividadId };
  }

  async eliminarActividadDestinoAdmin(payload: { destino_id: number; actividad_id: number }) {
    const { data: detalleExistente, error: detalleExistenteError } = await this.client
      .from('detalles_destinos')
      .select('id')
      .eq('destino_id', payload.destino_id)
      .maybeSingle();

    if (detalleExistenteError) throw detalleExistenteError;
    if (!detalleExistente?.id) {
      return { deleted: 0 };
    }

    const { error: borrarTraduccionesError } = await this.client
      .from('atracciones_principales_traducciones')
      .delete()
      .eq('atracciones_principales_id', payload.actividad_id);

    if (borrarTraduccionesError) throw borrarTraduccionesError;

    const { error: borrarActividadError } = await this.client
      .from('atracciones_principales')
      .delete()
      .eq('id', payload.actividad_id)
      .eq('detalles_destino_id', detalleExistente.id);

    if (borrarActividadError) throw borrarActividadError;

    return { deleted: 1 };
  }

  private async obtenerCatalogoAtraccionDefaultId(): Promise<number | null> {
    const { data, error } = await this.client
      .from('catalogo_atracciones')
      .select('id')
      .order('orden', { ascending: true })
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data?.id) {
      throw new Error('No hay registros en catalogo_atracciones. Crea al menos uno para usar atracciones.');
    }
    return data.id;
  }

  async obtenerDetalleCatalogoAtraccionesAdmin(catalogoAtraccionId: number) {
    const { data: catalogo, error: catalogoError } = await this.client
      .from('catalogo_atracciones')
      .select(`
        id,
        clave,
        icono,
        orden,
        activo,
        created_at,
        traducciones:catalogo_atracciones_traducciones (
          idioma_id,
          nombre,
          descripcion
        )
      `)
      .eq('id', catalogoAtraccionId)
      .maybeSingle();

    if (catalogoError) throw catalogoError;
    if (!catalogo) throw new Error('No se encontro el catalogo de atracciones solicitado.');

    const { data: atracciones, error: atraccionesError } = await this.client
      .from('atracciones')
      .select(`
        id,
        catalogo_atraccion_id,
        imagen_fondo,
        orden,
        activo,
        created_at,
        traducciones:atracciones_traducciones (
          idioma_id,
          nombre,
          descripcion
        )
      `)
      .eq('catalogo_atraccion_id', catalogoAtraccionId)
      .order('orden', { ascending: true })
      .order('id', { ascending: true });

    if (atraccionesError) throw atraccionesError;

    const traduccionCatalogoEs = catalogo?.traducciones?.find((x: any) => Number(x.idioma_id) === ES_ID);

    return {
      catalogo: {
        id: catalogo.id,
        clave: catalogo.clave ?? '',
        icono: catalogo.icono ?? '',
        orden: catalogo.orden ?? null,
        activo: Boolean(catalogo.activo),
        created_at: catalogo.created_at ?? null,
        nombre: traduccionCatalogoEs?.nombre ?? '',
        descripcion: traduccionCatalogoEs?.descripcion ?? ''
      },
      atracciones: (atracciones ?? []).map((item: any) => {
        const traduccionEs = item?.traducciones?.find((x: any) => Number(x.idioma_id) === ES_ID);
        return {
          id: item.id,
          imagen_fondo: item.imagen_fondo ?? '',
          orden: item.orden ?? null,
          activo: Boolean(item.activo),
          created_at: item.created_at ?? null,
          nombre: traduccionEs?.nombre ?? '',
          descripcion: traduccionEs?.descripcion ?? ''
        };
      })
    };
  }

  async actualizarRegistroCatalogoAtraccionAdmin(payload: {
    atraccion_id: number;
    nombre: string | null;
    descripcion: string | null;
    imagen_fondo: string | null;
    orden: number | null;
    activo: boolean;
  }) {
    const { data: updatedAtraccion, error: atraccionError } = await this.client
      .from('atracciones')
      .update({
        imagen_fondo: payload.imagen_fondo,
        orden: payload.orden,
        activo: payload.activo
      })
      .eq('id', payload.atraccion_id)
      .select('id')
      .maybeSingle();

    if (atraccionError) throw atraccionError;
    if (!updatedAtraccion?.id) {
      throw new Error('No se encontro la atraccion a actualizar.');
    }

    const { error: traduccionError } = await this.client
      .from('atracciones_traducciones')
      .upsert(
        {
          atraccion_id: payload.atraccion_id,
          idioma_id: ES_ID,
          nombre: payload.nombre ?? '',
          descripcion: payload.descripcion ?? ''
        },
        { onConflict: 'atraccion_id,idioma_id' }
      );

    if (traduccionError) throw traduccionError;
    return { id: payload.atraccion_id };
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
      .select('url_imagen, nombre_destino')
      .eq('activo', true)
      .order('id', { ascending: true });
    if (error) throw error;
    return data;
  }

  async obtenerTiposImagenHotel() {
    const { data, error } = await this.client
      .from('tipos_imagen')
      .select(`
    id,
    clave,
    orden,
    traducciones:tipos_imagen_traducciones!fk_tipo_imagen (
      id,
      lang,
      descripcion
    )
  `)
      .order('orden');

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
      p_estatus_clave: formValue.estatus,

      p_condiciones_precio: formValue.condicionesPrecioSinSeguro ?? [],
      p_condiciones_precio_seguro: formValue.condicionesPrecioConSeguro ?? [],
      p_condiciones_precio_meses: formValue.condicionesPrecioMeses ?? [],

      p_porcentaje_seguro: formValue.porcentajeSeguro,
      p_porcentaje_meses: formValue.porcentajeMeses,

      p_fecha_limite_seguro: formValue.fechaLimiteSeguro,
      p_fecha_limite_meses: formValue.fechaLimiteMeses

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

  // Admin: devuelve la estructura completa para crear/editar preview
  // con los 5 idiomas (es, en, pt, de, fr), aun si todavia no existe detalle.
  async obtenerDetalleDestinoTodosIdiomas(destinoId: number) {
    return this.obtenerPreviewDestinoAdmin(destinoId);
  }

  async consultarDestinos(): Promise<any> {
    const { data, error } = await this.client
      .rpc('obtener_destinos_con_hoteles', {
        p_tipo_destino: 'TODOS'
      });

    if (error) {
      console.error(error);
      return;
    }

    return data;
  }

  async actualizarOrdenDestinos(
    destinos: Array<{ id: number; orden: number }>
  ) {
    if (!destinos?.length) {
      return [];
    }

    const resultados = await Promise.all(
      destinos.map(({ id, orden }) =>
        this.client
          .from('destinos')
          .update({ orden })
          .eq('id', id)
          .select('id, orden')
          .maybeSingle()
      )
    );

    const error = resultados.find((r) => r.error)?.error;

    if (error) {
      console.error('Error actualizando orden de destinos:', error);
      throw error;
    }

    return resultados
      .map((r) => r.data)
      .filter(Boolean);
  }

  async obtenerDestinosAdmin() {
    const { data, error } = await this.client
      .from('destinos')
      .select('id, nombre, tipo_desino_id, destino_padre_id, continente_id')
      .order('nombre', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async obtenerRegimenesAdmin() {
    const { data, error } = await this.client
      .from('regimen')
      .select(`
        id,
        traducciones:regimen_traducciones (
          idioma_id,
          descripcion
        )
      `)
      .order('id', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((item: any) => {
      const traduccionEs = item?.traducciones?.find((x: any) => x.idioma_id === ES_ID);
      return {
        id: item.id,
        descripcion: traduccionEs?.descripcion ?? `Regimen ${item.id}`
      };
    });
  }

  async obtenerHotelesAdminPorDestino(destinoId: number) {
    const { data, error } = await this.client
      .from('hoteles')
      .select(`
        id,
        orden,
        regimen_id,
        destino_id,
        traducciones:hotel_traducciones (
          idioma_id,
          nombre_hotel
        ),
        regimen:regimen_id (
          id,
          traducciones:regimen_traducciones (
            idioma_id,
            descripcion
          )
        )
      `)
      .eq('destino_id', destinoId)
      .order('orden', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((item: any) => {
      const traduccionEs = item?.traducciones?.find((x: any) => x.idioma_id === ES_ID);
      const regimenEs = item?.regimen?.traducciones?.find((x: any) => x.idioma_id === ES_ID);

      return {
        id: item.id,
        orden: item.orden ?? null,
        regimen_id: item.regimen_id ?? null,
        destino_id: item.destino_id,
        nombre_hotel: traduccionEs?.nombre_hotel ?? '',
        regimen: regimenEs?.descripcion ?? ''
      };
    });
  }

  async obtenerHotelesAdminPorDestinoPadre(destinoPadreId: number) {
    const { data, error } = await this.client
      .from('hoteles')
      .select(`
        id,
        orden,
        regimen_id,
        destino_id,
        destinos:destino_id!inner (
          destino_padre_id
        ),
        traducciones:hotel_traducciones (
          idioma_id,
          nombre_hotel
        ),
        regimen:regimen_id (
          id,
          traducciones:regimen_traducciones (
            idioma_id,
            descripcion
          )
        )
      `)
      .eq('destinos.destino_padre_id', destinoPadreId)
      .order('orden', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((item: any) => {
      const traduccionEs = item?.traducciones?.find((x: any) => x.idioma_id === ES_ID);
      const regimenEs = item?.regimen?.traducciones?.find((x: any) => x.idioma_id === ES_ID);

      return {
        id: item.id,
        orden: item.orden ?? null,
        regimen_id: item.regimen_id ?? null,
        destino_id: item.destino_id,
        nombre_hotel: traduccionEs?.nombre_hotel ?? '',
        regimen: regimenEs?.descripcion ?? ''
      };
    });
  }

  async actualizarOrdenHoteles(hoteles: Array<{ id: number; orden: number }>) {
    if (!hoteles?.length) {
      return [];
    }

    const resultados = await Promise.all(
      hoteles.map(({ id, orden }) =>
        this.client
          .from('hoteles')
          .update({ orden })
          .eq('id', id)
          .select('id, orden')
          .maybeSingle()
      )
    );

    const error = resultados.find((r) => r.error)?.error;
    if (error) throw error;

    return resultados.map((r) => r.data).filter(Boolean);
  }

  async actualizarHotelAdmin(payload: {
    hotelId: number;
    nombre_hotel: string;
    regimen_id: number | null;
    orden: number | null;
  }) {
    const { error: errorHotel } = await this.client
      .from('hoteles')
      .update({
        regimen_id: payload.regimen_id,
        orden: payload.orden
      })
      .eq('id', payload.hotelId);

    if (errorHotel) throw errorHotel;

    const { error: errorTraduccion } = await this.client
      .from('hotel_traducciones')
      .upsert(
        {
          hotel_id: payload.hotelId,
          idioma_id: ES_ID,
          nombre_hotel: payload.nombre_hotel
        },
        { onConflict: 'hotel_id,idioma_id' }
      );

    if (errorTraduccion) throw errorTraduccion;
  }

  async obtenerCatalogoAdmin(catalogo: CatalogoAdminKey): Promise<any[]> {
    switch (catalogo) {
      case 'actividades': {
        const { data, error } = await this.client
          .from('actividades')
          .select('id, descripcion, clave, activo, orden')
          .order('orden', { ascending: true })
          .order('id', { ascending: true });
        if (error) throw error;
        return data ?? [];
      }
      case 'conceptos': {
        const { data, error } = await this.client
          .from('conceptos')
          .select('id, descripcion, icono')
          .order('id', { ascending: true });
        if (error) throw error;
        return data ?? [];
      }
      case 'continentes': {
        const { data, error } = await this.client
          .from('continentes')
          .select('id, nombre')
          .order('id', { ascending: true });
        if (error) throw error;
        return data ?? [];
      }
      case 'descuentos': {
        const { data, error } = await this.client
          .from('descuentos')
          .select('id, tipo_descuento, icono')
          .order('id', { ascending: true });
        if (error) throw error;
        return data ?? [];
      }
      case 'idiomas': {
        const { data, error } = await this.client
          .from('idiomas')
          .select('id, codigo, nombre, activo, orden')
          .order('orden', { ascending: true })
          .order('id', { ascending: true });
        if (error) throw error;
        return data ?? [];
      }
      case 'politicas': {
        const { data, error } = await this.client
          .from('politicas')
          .select('id, codigo, categoria, activo, created_at')
          .order('id', { ascending: true });
        if (error) throw error;
        return data ?? [];
      }
      case 'regimen_hotel': {
        const { data, error } = await this.client
          .from('regimen')
          .select(`
            id,
            traducciones:regimen_traducciones (
              idioma_id,
              descripcion
            )
          `)
          .order('id', { ascending: true });

        if (error) throw error;

        return (data ?? []).map((item: any) => {
          const traduccionEs = item?.traducciones?.find((x: any) => x.idioma_id === ES_ID);
          return {
            id: item.id,
            descripcion: traduccionEs?.descripcion ?? `Regimen ${item.id}`
          };
        });
      }
      case 'tarifas': {
        const { data, error } = await this.client
          .from('tarifas')
          .select('id, clave, nombre, activo, created_at')
          .order('id', { ascending: true });
        if (error) throw error;
        return data ?? [];
      }
      case 'tipo_imagen': {
        const { data, error } = await this.client
          .from('tipos_imagen')
          .select('id, clave, orden')
          .order('orden', { ascending: true })
          .order('id', { ascending: true });
        if (error) throw error;
        return data ?? [];
      }
      case 'tipos_habitacion': {
        const { data, error } = await this.client
          .from('tipos_habitacion')
          .select('id, nombre_habitacion, descripcion')
          .order('id', { ascending: true });
        if (error) throw error;
        return data ?? [];
      }
      case 'atracciones': {
        const { data, error } = await this.client
          .from('catalogo_atracciones')
          .select(`
            id,
            clave,
            icono,
            orden,
            activo,
            created_at,
            traducciones:catalogo_atracciones_traducciones (
              idioma_id,
              nombre,
              descripcion
            )
          `)
          .order('orden', { ascending: true })
          .order('id', { ascending: true });
        if (error) throw error;
        const { data: atraccionesRows, error: atraccionesError } = await this.client
          .from('atracciones')
          .select('id, catalogo_atraccion_id')
          .eq('activo', true);
        if (atraccionesError) throw atraccionesError;

        const conteoPorCatalogo = new Map<number, number>();
        (atraccionesRows ?? []).forEach((row: any) => {
          const key = Number(row.catalogo_atraccion_id);
          conteoPorCatalogo.set(key, (conteoPorCatalogo.get(key) ?? 0) + 1);
        });

        return (data ?? []).map((item: any) => {
          const traduccionEs = item?.traducciones?.find((x: any) => x.idioma_id === ES_ID);
          return {
            id: item.id,
            clave: item.clave,
            icono: item.icono,
            orden: item.orden,
            activo: item.activo,
            created_at: item.created_at,
            nombre: traduccionEs?.nombre ?? '',
            descripcion: traduccionEs?.descripcion ?? '',
            total_registros: conteoPorCatalogo.get(Number(item.id)) ?? 0
          };
        });
      }
      default:
        return [];
    }
  }

  async actualizarOrdenCatalogoAdmin(
    catalogo: CatalogoAdminKey,
    registros: Array<{ id: number; orden: number }>
  ) {
    if (!registros?.length) {
      return [];
    }

    const tablaPorCatalogo: Record<CatalogoAdminKey, string | null> = {
      actividades: 'actividades',
      conceptos: null,
      continentes: null,
      descuentos: null,
      idiomas: 'idiomas',
      politicas: null,
      regimen_hotel: null,
      tarifas: null,
      tipo_imagen: 'tipos_imagen',
      tipos_habitacion: null,
      atracciones: 'catalogo_atracciones'
    };

    const tabla = tablaPorCatalogo[catalogo];
    if (!tabla) {
      throw new Error('Este catalogo no admite orden manual.');
    }

    const resultados = await Promise.all(
      registros.map(({ id, orden }) =>
        this.client
          .from(tabla)
          .update({ orden })
          .eq('id', id)
          .select('id, orden')
          .maybeSingle()
      )
    );

    const error = resultados.find((r) => r.error)?.error;
    if (error) throw error;

    return resultados.map((r) => r.data).filter(Boolean);
  }

  async actualizarCatalogoAdmin(
    catalogo: CatalogoAdminKey,
    id: number,
    payload: Record<string, any>
  ) {
    switch (catalogo) {
      case 'actividades': {
        const { data, error } = await this.client
          .from('actividades')
          .update({
            descripcion: payload.descripcion ?? null,
            clave: payload.clave ?? null,
            activo: payload.activo ?? null
          })
          .eq('id', id)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        return data;
      }
      case 'conceptos': {
        const { data, error } = await this.client
          .from('conceptos')
          .update({
            descripcion: payload.descripcion ?? null,
            icono: payload.icono ?? null
          })
          .eq('id', id)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        return data;
      }
      case 'continentes': {
        const { data, error } = await this.client
          .from('continentes')
          .update({
            nombre: payload.nombre ?? null
          })
          .eq('id', id)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        return data;
      }
      case 'descuentos': {
        const { data, error } = await this.client
          .from('descuentos')
          .update({
            tipo_descuento: payload.tipo_descuento ?? null,
            icono: payload.icono ?? null
          })
          .eq('id', id)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        return data;
      }
      case 'idiomas': {
        const { data, error } = await this.client
          .from('idiomas')
          .update({
            codigo: payload.codigo ?? null,
            nombre: payload.nombre ?? null,
            activo: payload.activo ?? null
          })
          .eq('id', id)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        return data;
      }
      case 'politicas': {
        const { data, error } = await this.client
          .from('politicas')
          .update({
            codigo: payload.codigo ?? null,
            categoria: payload.categoria ?? null,
            activo: payload.activo ?? null
          })
          .eq('id', id)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        return data;
      }
      case 'regimen_hotel': {
        const { data, error } = await this.client
          .from('regimen_traducciones')
          .upsert(
            {
              regimen_id: id,
              idioma_id: ES_ID,
              descripcion: payload.descripcion ?? ''
            },
            { onConflict: 'regimen_id,idioma_id' }
          )
          .select('regimen_id')
          .maybeSingle();
        if (error) throw error;
        return data;
      }
      case 'tarifas': {
        const { data, error } = await this.client
          .from('tarifas')
          .update({
            clave: payload.clave ?? null,
            nombre: payload.nombre ?? null,
            activo: payload.activo ?? null
          })
          .eq('id', id)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        return data;
      }
      case 'tipo_imagen': {
        const { data, error } = await this.client
          .from('tipos_imagen')
          .update({
            clave: payload.clave ?? null
          })
          .eq('id', id)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        return data;
      }
      case 'tipos_habitacion': {
        const { data, error } = await this.client
          .from('tipos_habitacion')
          .update({
            nombre_habitacion: payload.nombre_habitacion ?? null,
            descripcion: payload.descripcion ?? null
          })
          .eq('id', id)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        return data;
      }
      case 'atracciones': {
        const { data, error } = await this.client
          .from('catalogo_atracciones')
          .update({
            clave: payload.clave ?? null,
            icono: payload.icono ?? null,
            activo: payload.activo ?? null
          })
          .eq('id', id)
          .select('id')
          .maybeSingle();
        if (error) throw error;

        const { error: traduccionError } = await this.client
          .from('catalogo_atracciones_traducciones')
          .upsert(
            {
              catalogo_atraccion_id: id,
              idioma_id: ES_ID,
              nombre: payload.nombre ?? '',
              descripcion: payload.descripcion ?? ''
            },
            { onConflict: 'catalogo_atraccion_id,idioma_id' }
          );

        if (traduccionError) throw traduccionError;
        return data;
      }
      default:
        return null;
    }
  }

}
