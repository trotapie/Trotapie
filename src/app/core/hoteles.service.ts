import { inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from 'app/core/supabase.service';
import { getDefaultLang } from 'app/lang.utils';
import { TranslocoService } from '@jsverse/transloco';

const ES_ID = 1;

export interface IHotelAdminCatalogo {
  id: number;
  nombre_hotel: string;
  destino_nombre: string;
  regimen: string;
  regimen_id: number | null;
  destino_id: number;
  division_area_id: number | null;
  division_area_nombre: string;
  pais_id: number | null;
  pais_nombre: string;
  region_id: number | null;
  region_nombre: string;
  catalogo_destino_id: number | null;
  catalogo_destino_nombre: string;
  tipo_catalogo: 'NACIONAL' | 'INTERNACIONAL' | null;
  orden: number | null;
}

@Injectable({ providedIn: 'root' })
export class HotelesService {
  private readonly supabase = inject(SupabaseService);
  private readonly transloco = inject(TranslocoService);

  private get client(): SupabaseClient {
    return this.supabase.getClient();
  }

  async getIdiomaId(codigo: string) {
    const { data, error } = await this.client
      .from('idiomas')
      .select('id')
      .eq('codigo', codigo)
      .maybeSingle();

    if (error) throw error;
    return data?.id ?? 1;
  }

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
    division_area_id,
    catalogo_destino_id,
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
    ),

    tipos_habitacion:hotel_tipos_habitacion!hotel_tipos_habitacion_hotel_id_fkey (
      tipo_habitacion:tipos_habitacion!hotel_tipos_habitacion_tipo_habitacion_id_fkey (
        id
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

    const tiposHabitacionIds = (data?.tipos_habitacion ?? [])
      .map((x: any) => Number(x.tipo_habitacion?.id))
      .filter((id: number) => Number.isFinite(id));

    const datos = {
      ...data,
      nombre_hotel: traducida?.nombre_hotel ?? tEs?.nombre_hotel,
      descripcion: traducida?.descripcion ?? this.transloco.translate('sin-descripcion'),
      actividades: actividadesTraducidas,
      regimenes: regimenesTraducidos,
      tipos_habitacion_ids: tiposHabitacionIds
    };

    return datos;
  }

  addHotel(payload: { nombre: string; ciudad: string; descripcion?: string }) {
    return this.client.from('hoteles').insert(payload).single();
  }

  subscribeHotelesChanges(handler: (payload: any) => void) {
    const ch = this.client
      .channel('room:hoteles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hoteles' }, handler)
      .subscribe();
    return () => { this.client.removeChannel(ch); };
  }

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

  private async obtenerHotelesCatalogoAdminBase() {
    const { data, error } = await this.client
      .from('v_hoteles_catalogo_admin')
      .select(`
        id,
        orden,
        regimen_id,
        legacy_destino_id,
        division_area_id_resuelto,
        division_area_nombre_resuelto,
        pais_id_resuelto,
        pais_nombre_resuelto,
        region_id_resuelto,
        region_nombre_resuelto,
        catalogo_destino_id_resuelto,
        catalogo_destino_nombre_resuelto,
        tipo_catalogo,
        nombre_hotel,
        regimen
      `)
      .order('orden', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  private mapHotelCatalogoAdmin(item: any): IHotelAdminCatalogo {
    const divisionAreaNombre = String(item?.division_area_nombre_resuelto ?? '').trim();
    const catalogoDestinoNombre = String(item?.catalogo_destino_nombre_resuelto ?? '').trim();
    return {
      id: Number(item.id),
      orden: item.orden ?? null,
      regimen_id: item.regimen_id ?? null,
      destino_id: Number(item.legacy_destino_id ?? 0),
      nombre_hotel: String(item?.nombre_hotel ?? ''),
      regimen: String(item?.regimen ?? ''),
      division_area_id: Number.isFinite(Number(item?.division_area_id_resuelto))
        ? Number(item.division_area_id_resuelto)
        : null,
      division_area_nombre: divisionAreaNombre,
      pais_id: Number.isFinite(Number(item?.pais_id_resuelto))
        ? Number(item.pais_id_resuelto)
        : null,
      pais_nombre: String(item?.pais_nombre_resuelto ?? ''),
      region_id: Number.isFinite(Number(item?.region_id_resuelto))
        ? Number(item.region_id_resuelto)
        : null,
      region_nombre: String(item?.region_nombre_resuelto ?? ''),
      catalogo_destino_id: Number.isFinite(Number(item?.catalogo_destino_id_resuelto))
        ? Number(item.catalogo_destino_id_resuelto)
        : null,
      catalogo_destino_nombre: catalogoDestinoNombre,
      destino_nombre: catalogoDestinoNombre || divisionAreaNombre,
      tipo_catalogo: (item?.tipo_catalogo ?? null) as 'NACIONAL' | 'INTERNACIONAL' | null
    };
  }

  async obtenerHotelesAdminPorDivisionArea(divisionAreaId: number) {
    const hoteles = await this.obtenerHotelesCatalogoAdminBase();
    return hoteles
      .map((item: any) => this.mapHotelCatalogoAdmin(item))
      .filter((item) => item.division_area_id === divisionAreaId);
  }

  async obtenerHotelesAdminPorPaisCatalogo(paisId: number) {
    const hoteles = await this.obtenerHotelesCatalogoAdminBase();
    return hoteles
      .map((item: any) => this.mapHotelCatalogoAdmin(item))
      .filter((item) => item.pais_id === paisId);
  }

  async obtenerHotelesAdminPorCatalogoDestino(catalogoDestinoId: number) {
    const hoteles = await this.obtenerHotelesCatalogoAdminBase();
    return hoteles
      .map((item: any) => this.mapHotelCatalogoAdmin(item))
      .filter((item) => item.catalogo_destino_id === catalogoDestinoId);
  }

  async obtenerHotelesAdmin() {
    const hoteles = await this.obtenerHotelesCatalogoAdminBase();
    return hoteles.map((item: any) => this.mapHotelCatalogoAdmin(item));
  }

  async actualizarOrdenHoteles(hoteles: Array<{ id: number; orden: number }>) {
    if (!hoteles?.length) {
      return [];
    }

    const payload = hoteles.map(({ id, orden }) => ({ id, orden }));
    const { data, error } = await this.client
      .from('hoteles')
      .upsert(payload, { onConflict: 'id' })
      .select('id, orden');

    if (error) throw error;
    return data ?? [];
  }

  async eliminarHotelAdmin(hotelId: number) {
    if (!Number.isFinite(hotelId)) {
      throw new Error('Hotel invalido para eliminar.');
    }

    const { error: errorRoomTypes } = await this.client
      .from('hotel_tipos_habitacion')
      .delete()
      .eq('hotel_id', hotelId);

    if (errorRoomTypes) throw errorRoomTypes;

    const { error: errorRegimenes } = await this.client
      .from('regimen_hotel')
      .delete()
      .eq('hotel_id', hotelId);

    if (errorRegimenes) throw errorRegimenes;

    const { error: errorActividades } = await this.client
      .from('actividades_hotel')
      .delete()
      .eq('hotel_id', hotelId);

    if (errorActividades) throw errorActividades;

    const { error: errorImagenes } = await this.client
      .from('imagenes_hoteles')
      .delete()
      .eq('hotel_id', hotelId);

    if (errorImagenes) throw errorImagenes;

    const { error: errorTraducciones } = await this.client
      .from('hotel_traducciones')
      .delete()
      .eq('hotel_id', hotelId);

    if (errorTraducciones) throw errorTraducciones;

    const { error: errorHotel } = await this.client
      .from('hoteles')
      .delete()
      .eq('id', hotelId);

    if (errorHotel) throw errorHotel;

    return { deleted: 1 };
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

  async crearHotelDetalleAdmin(payload: {
    nombre_hotel: string;
    descripcion: string | null;
    orden: number | null;
    estrellas: number | null;
    fondo: string | null;
    ubicacion: string | null;
    destino_id: number;
    division_area_id?: number | null;
    catalogo_destino_id?: number | null;
    descuento_id: number | null;
    regimen_id: number | null;
    regimen_ids: number[];
    actividad_ids: number[];
    room_type_ids?: number[];
    imagenes: Array<{
      id?: number | null;
      url_imagen: string;
      tipo_imagen_id: number | null;
      eliminar?: boolean;
    }>;
    traducciones?: Array<{
      idioma_id: number;
      nombre_hotel: string;
      descripcion: string | null;
    }>;
  }) {
    return this.guardarHotelDetalleAdminRpc(null, payload);
  }

  async actualizarHotelDetalleAdmin(payload: {
    hotelId: number;
    nombre_hotel: string;
    descripcion: string | null;
    orden: number | null;
    estrellas: number | null;
    fondo: string | null;
    ubicacion: string | null;
    destino_id: number;
    division_area_id?: number | null;
    catalogo_destino_id?: number | null;
    descuento_id: number | null;
    regimen_id: number | null;
    regimen_ids: number[];
    actividad_ids: number[];
    room_type_ids?: number[];
    imagenes: Array<{
      id?: number | null;
      url_imagen: string;
      tipo_imagen_id: number | null;
      eliminar?: boolean;
    }>;
    traducciones?: Array<{
      idioma_id: number;
      nombre_hotel: string;
      descripcion: string | null;
    }>;
  }) {
    const hotelId = Number(payload.hotelId);
    if (!Number.isFinite(hotelId)) {
      throw new Error('Hotel invalido para actualizar.');
    }
    await this.guardarHotelDetalleAdminRpc(hotelId, payload);
  }

  private async guardarHotelDetalleAdminRpc(
    hotelId: number | null,
    payload: {
      nombre_hotel: string;
      descripcion: string | null;
      orden: number | null;
      estrellas: number | null;
      fondo: string | null;
      ubicacion: string | null;
      destino_id: number;
      division_area_id?: number | null;
      catalogo_destino_id?: number | null;
      descuento_id: number | null;
      regimen_id: number | null;
      regimen_ids: number[];
      actividad_ids: number[];
      room_type_ids?: number[];
      imagenes: Array<{
        id?: number | null;
        url_imagen: string;
        tipo_imagen_id: number | null;
        eliminar?: boolean;
      }>;
      traducciones?: Array<{
        idioma_id: number;
        nombre_hotel: string;
        descripcion: string | null;
      }>;
    }
  ): Promise<number> {
    const descuentoIdNormalizado =
      payload.descuento_id === null || payload.descuento_id === undefined
        ? null
        : Number(payload.descuento_id);
    const descuentoId = Number.isFinite(descuentoIdNormalizado) ? descuentoIdNormalizado : null;

    const regimenIdNormalizado =
      payload.regimen_id === null || payload.regimen_id === undefined
        ? null
        : Number(payload.regimen_id);
    const regimenId = Number.isFinite(regimenIdNormalizado) ? regimenIdNormalizado : null;

    const regimenesIds = [
      ...new Set(
        (payload.regimen_ids ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0)
      )
    ];
    const actividadesIds = [
      ...new Set(
        (payload.actividad_ids ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0)
      )
    ];
    const roomTypeIds = [
      ...new Set(
        (payload.room_type_ids ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0)
      )
    ];
    const imagenes = (payload.imagenes ?? [])
      .map((item) => ({
        id: item.id ? Number(item.id) : null,
        url_imagen: (item.url_imagen ?? '').trim(),
        tipo_imagen_id: item.tipo_imagen_id ? Number(item.tipo_imagen_id) : null,
        eliminar: Boolean(item.eliminar)
      }))
      .filter((item) => item.url_imagen.length > 0);

    const traducciones = (payload.traducciones?.length
      ? payload.traducciones
      : [
          {
            idioma_id: ES_ID,
            nombre_hotel: payload.nombre_hotel,
            descripcion: payload.descripcion
          }
        ]
    )
      .map((item) => ({
        idioma_id: Number(item.idioma_id),
        nombre_hotel: (item.nombre_hotel ?? '').trim(),
        descripcion: item.descripcion
      }))
      .filter((item) => Number.isFinite(item.idioma_id) && item.idioma_id > 0 && item.nombre_hotel.length > 0);

    const rpcPayload = {
      nombre_hotel: (payload.nombre_hotel ?? '').trim(),
      descripcion: payload.descripcion,
      orden: payload.orden,
      estrellas: payload.estrellas,
      fondo: payload.fondo,
      ubicacion: payload.ubicacion,
      destino_id: payload.destino_id,
      descuento_id: descuentoId,
      regimen_id: regimenId,
      regimen_ids: regimenesIds,
      actividad_ids: actividadesIds,
      imagenes,
      traducciones
    };

    const { data, error } = await this.client.rpc('guardar_hotel_detalle_admin', {
      p_hotel_id: hotelId,
      p_payload: rpcPayload
    });

    if (error) throw error;    
    const hotelIdGuardado = Number(data.hotel_id);
    if (!Number.isFinite(hotelIdGuardado)) {
      throw new Error('No se pudo guardar el hotel.');
    }

    const { error: errorCatalogo } = await this.client
      .from('hoteles')
      .update({
        division_area_id: payload.division_area_id ?? null,
        catalogo_destino_id: payload.catalogo_destino_id ?? null
      })
      .eq('id', hotelIdGuardado);

    if (errorCatalogo) throw errorCatalogo;

    if (roomTypeIds.length) {
      await this.sincronizarTiposHabitacionHotel(hotelIdGuardado, roomTypeIds);
    }

    return hotelIdGuardado;
  }

  private async sincronizarTiposHabitacionHotel(hotelId: number, tipoIds: number[]) {
    const { error: deleteError } = await this.client
      .from('hotel_tipos_habitacion')
      .delete()
      .eq('hotel_id', hotelId);

    if (deleteError) throw deleteError;

    if (!tipoIds.length) return;

    const inserts = tipoIds.map((tipoId) => ({
      hotel_id: hotelId,
      tipo_habitacion_id: tipoId
    }));

    const { error: insertError } = await this.client
      .from('hotel_tipos_habitacion')
      .insert(inserts);

    if (insertError) throw insertError;
  }
}
