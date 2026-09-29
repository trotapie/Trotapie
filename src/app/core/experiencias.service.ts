import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { DestinosService, DestinoCatalogoNavegable } from './destinos.service';

export type ExperienciaTipo = 'cabana' | 'promocion';
export const IDIOMAS_EXPERIENCIAS = ['es', 'en', 'fr', 'de', 'pt'] as const;
export type IdiomaExperiencia = typeof IDIOMAS_EXPERIENCIAS[number];

export interface FichaExperiencia {
  id: number;
  tipo: ExperienciaTipo;
  publicada: boolean;
  catalogo_destino_id: number | null;
  destinoFiltroId: number | null;
  hotel_id: number | null;
  destinoNombre: string;
  hotelNombre: string;
  imagen_principal: string;
  imagenes: string[];
  precio_desde: number | null;
  precio_promocional: number | null;
  precio_anterior: number | null;
  descuento_porcentaje: number | null;
  moneda: string;
  precio_por: 'noche' | 'estancia';
  precio_personas: number;
  adultos_max: number;
  ninos_max: number;
  habitaciones: number;
  disponible_desde: string;
  disponible_hasta: string;
  vigencia_desde: string;
  vigencia_hasta: string;
  viaje_desde: string;
  viaje_hasta: string;
  amenidadIds: number[];
  amenidades: string[];
  traducciones: Record<string, Record<string, string>>;
  nombre: string;
  descripcion: string;
  camas: string;
  experiencia: string;
  zona: string;
  referencia_mapa: string;
  etiqueta: string;
  condiciones: string;
}

@Injectable({ providedIn: 'root' })
export class ExperienciasService {
  private readonly supabase = inject(SupabaseService);
  private readonly destinosService = inject(DestinosService);
  private get db() { return this.supabase.getClient(); }

  private async todosLosDestinosCatalogo(tipo?: 'NACIONAL' | 'INTERNACIONAL', paisId?: number): Promise<DestinoCatalogoNavegable[]> {
    const cargarTipo = async (categoria: 'NACIONAL' | 'INTERNACIONAL'): Promise<DestinoCatalogoNavegable[]> => {
      const items: DestinoCatalogoNavegable[] = [];
      let page = 0;
      let total = 0;
      do {
        const resultado = await this.destinosService.buscarDestinosCatalogo({ tipo: categoria, paisIds: paisId ? [paisId] : [], page, pageSize: 100 });
        items.push(...resultado.items);
        total = resultado.total;
        page++;
        if (!resultado.items.length) break;
      } while (items.length < total);
      return items;
    };
    if (tipo) return cargarTipo(tipo);
    const [nacionales, internacionales] = await Promise.all([cargarTipo('NACIONAL'), cargarTipo('INTERNACIONAL')]);
    return [...nacionales, ...internacionales];
  }

  async subirImagen(tipo: ExperienciaTipo, archivo: File): Promise<string> {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) throw new Error('Elige una imagen JPG, PNG o WebP.');
    if (archivo.size > 10 * 1024 * 1024) throw new Error('La imagen no debe superar 10 MB.');
    const extension = archivo.type === 'image/png' ? 'png' : archivo.type === 'image/webp' ? 'webp' : 'jpg';
    const ruta = `${tipo === 'cabana' ? 'cabanas' : 'promociones'}/${crypto.randomUUID()}.${extension}`;
    const { error } = await this.db.storage.from('experiencias').upload(ruta, archivo, { contentType: archivo.type });
    if (error) throw error;
    return this.db.storage.from('experiencias').getPublicUrl(ruta).data.publicUrl;
  }

  async opciones(tipo?: 'NACIONAL' | 'INTERNACIONAL') {
    const [destinos, regiones, hoteles, amenidades] = await Promise.all([
      tipo === 'INTERNACIONAL' ? Promise.resolve([] as DestinoCatalogoNavegable[]) : this.todosLosDestinosCatalogo(tipo),
      tipo === 'INTERNACIONAL' ? this.destinosService.obtenerCatalogoInternacionalRegiones() : Promise.resolve([]),
      this.db.from('hoteles').select('id,catalogo_destino_id,hotel_traducciones(idioma_id,nombre_hotel)').order('id'),
      this.db.from('actividades').select('id,actividades_traducciones(idioma_id,descripcion)').order('id')
    ]);
    for (const response of [hoteles, amenidades]) if (response.error) throw response.error;
    return {
      destinos: destinos.map((d) => ({ id: d.destinoId, nombre: d.destinoNombre, divisionAreaId: d.divisionAreaId, estado: d.divisionAreaNombre, pais: d.paisNombre, paisId: d.paisId, region: d.regionNombre, regionId: d.regionId, tipo: d.tipo, activo: d.activo })),
      regiones: regiones.map((region) => ({ id: region.id, nombre: region.nombre })),
      hoteles: (hoteles.data ?? []).map((h: any) => ({ id: h.id, destinoId: h.catalogo_destino_id ?? null, nombre: h.hotel_traducciones?.find((t: any) => t.idioma_id === 1)?.nombre_hotel ?? `Hotel #${h.id}` })),
      amenidades: (amenidades.data ?? []).map((a: any) => ({ id: a.id, nombre: a.actividades_traducciones?.find((t: any) => t.idioma_id === 1)?.descripcion ?? `Amenidad #${a.id}` }))
    };
  }

  async paisesPorContinente(continenteId: number) {
    return this.destinosService.obtenerCatalogoInternacionalPaises([continenteId]);
  }

  async destinosPorPais(paisId: number) {
    const destinos = await this.todosLosDestinosCatalogo('INTERNACIONAL', paisId);
    return destinos.map((d) => ({ id: d.destinoId, nombre: d.destinoNombre, divisionAreaId: d.divisionAreaId, estado: d.divisionAreaNombre, pais: d.paisNombre, paisId: d.paisId, region: d.regionNombre, regionId: d.regionId, tipo: d.tipo, activo: d.activo }));
  }

  async listar(tipo: ExperienciaTipo, idioma = 'es', admin = false): Promise<FichaExperiencia[]> {
    const tabla = tipo === 'cabana' ? 'cabanas' : 'promociones';
    let query = this.db.from(tabla).select('*').order('created_at', { ascending: false });
    if (!admin) {
      query = query.eq('publicada', true);
      if (tipo === 'cabana') query = query.or(`disponible_hasta.is.null,disponible_hasta.gte.${new Date().toISOString().slice(0, 10)}`);
      if (tipo === 'promocion') {
        const hoy = new Date().toISOString().slice(0, 10);
        query = query.lte('vigencia_desde', hoy).gte('vigencia_hasta', hoy);
      }
    }
    const { data, error } = await query;
    if (error) throw error;
    const filas = data ?? [];
    if (!filas.length) return [];
    const ids = filas.map((fila: any) => fila.id);
    const hotelIds = [...new Set(filas.map((fila: any) => fila.hotel_id).filter((id: number | null) => id != null))];
    const traduccionTabla = tipo === 'cabana' ? 'cabanas_traducciones' : 'promociones_traducciones';
    const clave = tipo === 'cabana' ? 'cabana_id' : 'promocion_id';
    const [traducciones, idiomas, hoteles, imagenes, vinculaciones, amenidades] = await Promise.all([
      this.db.from(traduccionTabla).select('*').in(clave, ids),
      this.db.from('idiomas').select('id,codigo'),
      hotelIds.length ? this.db.from('hoteles').select('id,catalogo_destino_id,hotel_traducciones(idioma_id,nombre_hotel)').in('id', hotelIds) : Promise.resolve({ data: [], error: null }),
      tipo === 'cabana' ? this.db.from('cabanas_imagenes').select('cabana_id,url,orden').in('cabana_id', ids).order('orden') : Promise.resolve({ data: [], error: null }),
      tipo === 'cabana' ? this.db.from('cabanas_amenidades').select('cabana_id,actividad_id').in('cabana_id', ids) : Promise.resolve({ data: [], error: null }),
      tipo === 'cabana' ? this.db.from('actividades').select('id,actividades_traducciones(idioma_id,descripcion)') : Promise.resolve({ data: [], error: null })
    ]);
    for (const response of [traducciones, idiomas, hoteles, imagenes, vinculaciones, amenidades]) if (response.error) throw response.error;
    const destinoIds = [...new Set([
      ...filas.map((fila: any) => fila.catalogo_destino_id),
      ...(hoteles.data ?? []).map((hotel: any) => hotel.catalogo_destino_id)
    ].filter((id: number | null) => id != null))];
    const destinos = destinoIds.length
      ? await this.db.from('catalogo_destinos').select('id,nombre').in('id', destinoIds)
      : { data: [], error: null };
    if (destinos.error) throw destinos.error;
    const idiomaIds = new Map((idiomas.data ?? []).map((i: any) => [i.codigo, i.id]));
    const idiomaId = idiomaIds.get(idioma) ?? idiomaIds.get('es');
    return filas.map((fila: any) => {
      const textos = (traducciones.data ?? []).filter((t: any) => t[clave] === fila.id);
      const texto = textos.find((t: any) => t.idioma_id === idiomaId) ?? textos.find((t: any) => t.idioma_id === idiomaIds.get('es')) ?? {};
      const traduccionesPorIdioma: Record<string, Record<string, string>> = {};
      for (const t of textos as any[]) {
        const codigo = [...idiomaIds.entries()].find(([, id]) => id === t.idioma_id)?.[0];
        if (codigo) traduccionesPorIdioma[codigo] = t;
      }
      const hotel = (hoteles.data ?? []).find((h: any) => h.id === fila.hotel_id) as any;
      const amenidadIds = (vinculaciones.data ?? []).filter((v: any) => v.cabana_id === fila.id).map((v: any) => v.actividad_id);
      return {
        ...fila, tipo,
        catalogo_destino_id: fila.catalogo_destino_id ?? null, hotel_id: fila.hotel_id ?? null,
        destinoFiltroId: fila.catalogo_destino_id ?? hotel?.catalogo_destino_id ?? null,
        destinoNombre: (destinos.data ?? []).find((d: any) => d.id === (fila.catalogo_destino_id ?? hotel?.catalogo_destino_id))?.nombre ?? '',
        hotelNombre: hotel?.hotel_traducciones?.find((t: any) => t.idioma_id === idiomaId)?.nombre_hotel ?? hotel?.hotel_traducciones?.find((t: any) => t.idioma_id === idiomaIds.get('es'))?.nombre_hotel ?? '',
        imagenes: (imagenes.data ?? []).filter((i: any) => i.cabana_id === fila.id).map((i: any) => i.url),
        amenidadIds,
        amenidades: (amenidades.data ?? []).filter((a: any) => amenidadIds.includes(a.id)).map((a: any) => a.actividades_traducciones?.find((t: any) => t.idioma_id === idiomaId)?.descripcion ?? a.actividades_traducciones?.find((t: any) => t.idioma_id === idiomaIds.get('es'))?.descripcion).filter(Boolean),
        traducciones: traduccionesPorIdioma,
        nombre: texto.nombre ?? texto.titulo ?? '', descripcion: texto.descripcion ?? '', camas: texto.camas ?? '',
        experiencia: texto.experiencia ?? '', zona: texto.zona ?? fila.zona ?? '', referencia_mapa: texto.referencia_mapa ?? fila.referencia_mapa ?? '',
        etiqueta: texto.etiqueta ?? '', condiciones: texto.condiciones ?? '',
        precio_desde: fila.precio_desde ?? null, precio_promocional: fila.precio_promocional ?? null,
        precio_anterior: fila.precio_anterior ?? null, descuento_porcentaje: fila.descuento_porcentaje ?? null,
        precio_por: fila.precio_por ?? 'noche', precio_personas: fila.precio_personas ?? 1,
        adultos_max: fila.adultos_max ?? 1, ninos_max: fila.ninos_max ?? 0, habitaciones: fila.habitaciones ?? 1,
        disponible_desde: fila.disponible_desde ?? '', disponible_hasta: fila.disponible_hasta ?? '',
        vigencia_desde: fila.vigencia_desde ?? '', vigencia_hasta: fila.vigencia_hasta ?? '',
        viaje_desde: fila.viaje_desde ?? '', viaje_hasta: fila.viaje_hasta ?? ''
      } as FichaExperiencia;
    });
  }

  async guardar(ficha: FichaExperiencia): Promise<void> {
    const cabana = ficha.tipo === 'cabana';
    const tabla = cabana ? 'cabanas' : 'promociones';
    const traduccionTabla = cabana ? 'cabanas_traducciones' : 'promociones_traducciones';
    const clave = cabana ? 'cabana_id' : 'promocion_id';
    const payload = cabana ? {
      catalogo_destino_id: ficha.catalogo_destino_id, zona: ficha.traducciones['es']?.['zona'] ?? '', referencia_mapa: ficha.traducciones['es']?.['referencia_mapa'] ?? '',
      imagen_principal: ficha.imagen_principal, precio_desde: ficha.precio_desde, moneda: ficha.moneda, precio_por: ficha.precio_por,
      precio_personas: ficha.precio_personas, adultos_max: ficha.adultos_max, ninos_max: ficha.ninos_max, habitaciones: ficha.habitaciones,
      disponible_desde: ficha.disponible_desde || null, disponible_hasta: ficha.disponible_hasta || null, publicada: false
    } : {
      catalogo_destino_id: ficha.catalogo_destino_id, hotel_id: ficha.hotel_id, imagen_principal: ficha.imagen_principal,
      precio_promocional: ficha.precio_promocional, precio_anterior: ficha.precio_anterior, descuento_porcentaje: ficha.descuento_porcentaje,
      moneda: ficha.moneda, vigencia_desde: ficha.vigencia_desde, vigencia_hasta: ficha.vigencia_hasta,
      viaje_desde: ficha.viaje_desde, viaje_hasta: ficha.viaje_hasta, publicada: false
    };
    const result = ficha.id
      ? await this.db.from(tabla).update(payload).eq('id', ficha.id).select('id').single()
      : await this.db.from(tabla).insert(payload).select('id').single();
    if (result.error) throw result.error;
    const id = result.data.id;
    const { data: idiomas, error: idiomaError } = await this.db.from('idiomas').select('id,codigo').in('codigo', [...IDIOMAS_EXPERIENCIAS]);
    if (idiomaError) throw idiomaError;
    const traducciones = (idiomas ?? []).map((i: any) => {
      const texto = ficha.traducciones[i.codigo] ?? {};
      return cabana
        ? { [clave]: id, idioma_id: i.id, nombre: texto['nombre'] ?? '', descripcion: texto['descripcion'] ?? '', camas: texto['camas'] ?? '', experiencia: texto['experiencia'] ?? '', zona: texto['zona'] ?? '', referencia_mapa: texto['referencia_mapa'] ?? '' }
        : { [clave]: id, idioma_id: i.id, titulo: texto['nombre'] ?? '', etiqueta: texto['etiqueta'] ?? '', condiciones: texto['condiciones'] ?? '' };
    });
    const { error: traduccionError } = await this.db.from(traduccionTabla).upsert(traducciones, { onConflict: `${clave},idioma_id` });
    if (traduccionError) throw traduccionError;
    if (cabana) {
      for (const relacion of ['cabanas_imagenes', 'cabanas_amenidades']) {
        const { error } = await this.db.from(relacion).delete().eq('cabana_id', id);
        if (error) throw error;
      }
      if (ficha.imagenes.length) {
        const { error } = await this.db.from('cabanas_imagenes').insert(ficha.imagenes.map((url, orden) => ({ cabana_id: id, url, orden })));
        if (error) throw error;
      }
      if (ficha.amenidadIds.length) {
        const { error } = await this.db.from('cabanas_amenidades').insert(ficha.amenidadIds.map((actividad_id) => ({ cabana_id: id, actividad_id })));
        if (error) throw error;
      }
    }
    if (ficha.publicada) {
      const { error } = await this.db.from(tabla).update({ publicada: true }).eq('id', id);
      if (error) throw error;
    }
  }

  async eliminar(tipo: ExperienciaTipo, id: number): Promise<void> {
    const { error } = await this.db.from(tipo === 'cabana' ? 'cabanas' : 'promociones').delete().eq('id', id);
    if (error) throw error;
  }
}
