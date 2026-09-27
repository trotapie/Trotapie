import { inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from 'app/core/supabase.service';
import { getDefaultLang } from 'app/lang.utils';
import { TranslocoService } from '@jsverse/transloco';
import { normalizarHorarios, normalizarPlan } from 'app/components/hoteles/hotel-estancia.interface';

const ES_ID = 1;

function primerRegistro<T>(valor: T | T[] | null | undefined): T | null {
  return (Array.isArray(valor) ? valor[0] : valor) ?? null;
}

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
  private readonly idiomaIds = new Map<string, Promise<number>>();

  private get client(): SupabaseClient {
    return this.supabase.getClient();
  }

  async getIdiomaId(codigo = 'es') {
    if (codigo === 'es') return ES_ID;

    const idiomaPendiente = this.idiomaIds.get(codigo) ?? (async () => {
      const { data, error } = await this.client
        .from('idiomas')
        .select('id')
        .eq('codigo', codigo)
        .maybeSingle();

      if (error) throw error;
      return data?.id ?? ES_ID;
    })();

    this.idiomaIds.set(codigo, idiomaPendiente);
    return idiomaPendiente;
  }

  async infoHotelPrincipal(idHotel: number, lang?: string) {
    const idiomaId = await this.getIdiomaId(lang);
    const { data, error } = await this.client
      .from('hoteles')
      .select(`
        id,
        ubicacion,
        horarios,
        catalogoDestino:catalogo_destinos!hoteles_catalogo_destino_id_fkey (
          nombre,
          division_area:divisiones_area!catalogo_destinos_division_area_id_fkey (
            nombre,
            pais:paises!divisiones_area_pais_id_fkey (nombre)
          )
        ),
        destinoLegacy:destinos!hoteles_destino_id_fkey (nombre),
        traducciones:hotel_traducciones!hotel_traducciones_hotel_id_fkey (
          idioma_id,
          nombre_hotel,
          descripcion,
          plan_todo_incluido
        )
      `)
      .eq('id', idHotel)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const traduccion = data.traducciones?.find((item: any) => item.idioma_id === idiomaId) ??
      data.traducciones?.find((item: any) => item.idioma_id === ES_ID);
    const catalogo = primerRegistro(data.catalogoDestino);
    const division = primerRegistro(catalogo?.division_area);
    const pais = primerRegistro(division?.pais);
    const ubicacionNombre = [
      catalogo?.nombre ?? primerRegistro(data.destinoLegacy)?.nombre,
      division?.nombre,
      pais?.nombre
    ].map((parte) => String(parte ?? '').trim()).filter((parte, index, partes) => !!parte && partes.indexOf(parte) === index).join(', ');

    return {
      ...data,
      ubicacion_nombre: ubicacionNombre,
      nombre_hotel: traduccion?.nombre_hotel ?? '',
      descripcion: traduccion?.descripcion ?? this.transloco.translate('sin-descripcion'),
      horarios: normalizarHorarios(data.horarios),
      plan_todo_incluido: normalizarPlan(traduccion?.plan_todo_incluido) ??
        normalizarPlan(data.traducciones?.find((item: any) => item.idioma_id === ES_ID)?.plan_todo_incluido),
      imagenes: [],
      actividades: [],
      regimenes: []
    };
  }

  async infoHotelGaleria(idHotel: number) {
    const { data, error } = await this.client
      .from('imagenes_hoteles')
      .select(`
        id,
        url_imagen,
        tipo_imagen_id,
        tipo:tipos_imagen!imagenes_hoteles_tipo_imagen_id_fkey (
          id,
          clave,
          traducciones:tipos_imagen_traducciones!fk_tipo_imagen (
            lang,
            descripcion
          )
        )
      `)
      .eq('hotel_id', idHotel)
      .order('id', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async infoHotelAmenidades(idHotel: number, lang?: string) {
    const idiomaId = await this.getIdiomaId(lang);
    const { data, error } = await this.client
      .from('actividades_hotel')
      .select(`
        actividad:actividades!actividades_hotel_actividad_id_fkey (
          id,
          traducciones:actividades_traducciones (
            idioma_id,
            descripcion
          )
        )
      `)
      .eq('hotel_id', idHotel);

    if (error) throw error;

    return (data ?? []).flatMap((item: any) => {
      const actividad = item.actividad;
      const traduccion = actividad?.traducciones?.find((t: any) => t.idioma_id === idiomaId) ??
        actividad?.traducciones?.find((t: any) => t.idioma_id === ES_ID);
      return traduccion?.descripcion ? [{ id: actividad.id, descripcion: traduccion.descripcion }] : [];
    });
  }

  async infoHotelRegimenes(idHotel: number, lang?: string) {
    const idiomaId = await this.getIdiomaId(lang);
    const { data, error } = await this.client
      .from('regimen_hotel')
      .select(`
        regimen:regimen!regimen_hotel_regimen_id_fkey (
          id,
          traducciones:regimen_traducciones (
            idioma_id,
            descripcion
          )
        )
      `)
      .eq('hotel_id', idHotel);

    if (error) throw error;

    return (data ?? []).flatMap((item: any) => {
      const regimen = item.regimen;
      const traduccion = regimen?.traducciones?.find((t: any) => t.idioma_id === idiomaId) ??
        regimen?.traducciones?.find((t: any) => t.idioma_id === ES_ID);
      const traduccionEs = regimen?.traducciones?.find((t: any) => t.idioma_id === ES_ID);
      return traduccion?.descripcion
        ? [{ id: regimen.id, descripcion: traduccion.descripcion, es: traduccionEs?.descripcion }]
        : [];
    });
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

    catalogoDestino:catalogo_destino_id!inner ( id, nombre ),
    concepto:concepto_id ( id, descripcion, icono ),

    regimen:regimen_id (
      id,
      traducciones:regimen_traducciones (
        idioma_id,
        descripcion
      )
    )
  `)
      .eq('catalogoDestino.id', destinoId)
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
    horarios,
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
      descripcion,
      plan_todo_incluido
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

  async asignarTipoHabitacionHotel(hotelId: number, tipoHabitacionId: number) {
    if (!Number.isFinite(hotelId) || hotelId <= 0) {
      throw new Error('Hotel invalido para asignar el tipo de habitacion.');
    }
    if (!Number.isFinite(tipoHabitacionId) || tipoHabitacionId <= 0) {
      throw new Error('Tipo de habitacion invalido.');
    }

    const { error } = await this.client
      .from('hotel_tipos_habitacion')
      .upsert(
        {
          hotel_id: hotelId,
          tipo_habitacion_id: tipoHabitacionId
        },
        { onConflict: 'hotel_id,tipo_habitacion_id', ignoreDuplicates: true }
      );

    if (error) throw error;
  }

}
