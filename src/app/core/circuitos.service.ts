import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Circuito, CircuitoDestino, CircuitoHotel, CircuitoActividad, CircuitoImagen, CircuitoTraduccion } from 'app/shared/flyer-editor/models/circuito.interface';

const ES_ID = 1;

@Injectable({ providedIn: 'root' })
export class CircuitosService {
  private readonly supabase = inject(SupabaseService);

  private get client() {
    return this.supabase.getClient();
  }

  async listCircuitosAdmin() {
    const { data, error } = await this.client
      .from('circuitos')
      .select(`
        id,
        nombre,
        precio_total,
        duracion_dias,
        duracion_noches,
        activo,
        imagen_principal,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Circuito[];
  }

  async listCircuitosPublicos(lang?: string) {
    const idiomaId = lang ? await this.getIdiomaId(lang) : ES_ID;

    const { data, error } = await this.client
      .from('circuitos')
      .select(`
        id,
        nombre,
        precio_total,
        duracion_dias,
        duracion_noches,
        imagen_principal,
        traducciones:circuito_traducciones!inner (
          idioma_id,
          nombre,
          descripcion
        )
      `)
      .eq('activo', true)
      .eq('circuito_traducciones.idioma_id', idiomaId)
      .order('created_at', { ascending: false });

    if (error) {
      const { data: fallback, error: fallbackError } = await this.client
        .from('circuitos')
        .select(`
          id,
          nombre,
          precio_total,
          duracion_dias,
          duracion_noches,
          imagen_principal
        `)
        .eq('activo', true)
        .order('created_at', { ascending: false });

      if (fallbackError) throw fallbackError;
      return (fallback ?? []) as Circuito[];
    }

    return (data ?? []).map((item: any) => ({
      ...item,
      nombre: item.traducciones?.[0]?.nombre ?? item.nombre,
      descripcion: item.traducciones?.[0]?.descripcion ?? '',
    }));
  }

  async infoCircuito(id: number, lang?: string) {
    const idiomaId = lang ? await this.getIdiomaId(lang) : ES_ID;

    const { data, error } = await this.client
      .from('circuitos')
      .select(`
        id,
        nombre,
        descripcion,
        precio_total,
        duracion_dias,
        duracion_noches,
        activo,
        imagen_principal,
        created_at,
        updated_at,

        traducciones:circuito_traducciones (
          idioma_id,
          nombre,
          descripcion
        ),

        destinos:circuito_destinos (
          id,
          destino_id,
          orden,
          dias,
          noches
        ),

        hoteles:circuito_hoteles (
          id,
          hotel_id,
          noche,
          regimen_id
        ),

        actividades:circuito_actividades (
          id,
          actividad_id,
          dia,
          orden
        ),

        imagenes:circuito_imagenes (
          id,
          imagen_url,
          orden,
          activa
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const traduccionLang = (data.traducciones ?? []).find((t: any) => t.idioma_id === idiomaId);
    const traduccionEs = (data.traducciones ?? []).find((t: any) => t.idioma_id === ES_ID);

    return {
      ...data,
      nombre: traduccionLang?.nombre ?? data.nombre,
      descripcion: traduccionLang?.descripcion ?? traduccionEs?.descripcion ?? data.descripcion,
    } as Circuito;
  }

  async crearCircuito(payload: {
    nombre: string;
    descripcion: string;
    precio_total: number;
    duracion_dias: number;
    duracion_noches: number;
    imagen_principal: string;
    destinos: Omit<CircuitoDestino, 'id'>[];
    hoteles: Omit<CircuitoHotel, 'id'>[];
    actividades: Omit<CircuitoActividad, 'id'>[];
    imagenes: Omit<CircuitoImagen, 'id'>[];
    traducciones: CircuitoTraduccion[];
  }) {
    const { data: circuito, error: circuitoError } = await this.client
      .from('circuitos')
      .insert({
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        precio_total: payload.precio_total,
        duracion_dias: payload.duracion_dias,
        duracion_noches: payload.duracion_noches,
        imagen_principal: payload.imagen_principal || null,
      })
      .select('id')
      .single();

    if (circuitoError) throw circuitoError;
    const circuitoId = circuito.id;

    await Promise.all([
      this.insertDestinos(circuitoId, payload.destinos),
      this.insertHoteles(circuitoId, payload.hoteles),
      this.insertActividades(circuitoId, payload.actividades),
      this.insertImagenes(circuitoId, payload.imagenes),
      this.insertTraducciones(circuitoId, payload.traducciones),
    ]);

    return circuitoId;
  }

  async actualizarCircuito(
    id: number,
    payload: {
      nombre: string;
      descripcion: string;
      precio_total: number;
      duracion_dias: number;
      duracion_noches: number;
      activo: boolean;
      imagen_principal: string;
      destinos: Omit<CircuitoDestino, 'id'>[];
      hoteles: Omit<CircuitoHotel, 'id'>[];
      actividades: Omit<CircuitoActividad, 'id'>[];
      imagenes: Omit<CircuitoImagen, 'id'>[];
      traducciones: CircuitoTraduccion[];
    }
  ) {
    const { error: circuitoError } = await this.client
      .from('circuitos')
      .update({
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        precio_total: payload.precio_total,
        duracion_dias: payload.duracion_dias,
        duracion_noches: payload.duracion_noches,
        activo: payload.activo,
        imagen_principal: payload.imagen_principal || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (circuitoError) throw circuitoError;

    await Promise.all([
      this.reemplazarDestinos(id, payload.destinos),
      this.reemplazarHoteles(id, payload.hoteles),
      this.reemplazarActividades(id, payload.actividades),
      this.reemplazarImagenes(id, payload.imagenes),
      this.reemplazarTraducciones(id, payload.traducciones),
    ]);
  }

  async eliminarCircuito(id: number) {
    const { error } = await this.client.from('circuitos').delete().eq('id', id);
    if (error) throw error;
  }

  async toggleActivo(id: number, activo: boolean) {
    const { error } = await this.client
      .from('circuitos')
      .update({ activo, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  private async getIdiomaId(codigo: string) {
    const { data, error } = await this.client
      .from('idiomas')
      .select('id')
      .eq('codigo', codigo)
      .maybeSingle();

    if (error) throw error;
    return data?.id ?? ES_ID;
  }

  private async insertDestinos(circuitoId: number, destinos: Omit<CircuitoDestino, 'id'>[]) {
    if (!destinos.length) return;
    const { error } = await this.client.from('circuito_destinos').insert(
      destinos.map((d) => ({ circuito_id: circuitoId, ...d }))
    );
    if (error) throw error;
  }

  private async insertHoteles(circuitoId: number, hoteles: Omit<CircuitoHotel, 'id'>[]) {
    if (!hoteles.length) return;
    const { error } = await this.client.from('circuito_hoteles').insert(
      hoteles.map((h) => ({ circuito_id: circuitoId, ...h }))
    );
    if (error) throw error;
  }

  private async insertActividades(circuitoId: number, actividades: Omit<CircuitoActividad, 'id'>[]) {
    if (!actividades.length) return;
    const { error } = await this.client.from('circuito_actividades').insert(
      actividades.map((a) => ({ circuito_id: circuitoId, ...a }))
    );
    if (error) throw error;
  }

  private async insertImagenes(circuitoId: number, imagenes: Omit<CircuitoImagen, 'id'>[]) {
    if (!imagenes.length) return;
    const { error } = await this.client.from('circuito_imagenes').insert(
      imagenes.map((img) => ({ circuito_id: circuitoId, ...img }))
    );
    if (error) throw error;
  }

  private async insertTraducciones(circuitoId: number, traducciones: CircuitoTraduccion[]) {
    if (!traducciones.length) return;
    const { error } = await this.client.from('circuito_traducciones').insert(
      traducciones.map((t) => ({ circuito_id: circuitoId, ...t }))
    );
    if (error) throw error;
  }

  private async reemplazarDestinos(circuitoId: number, destinos: Omit<CircuitoDestino, 'id'>[]) {
    await this.client.from('circuito_destinos').delete().eq('circuito_id', circuitoId);
    if (destinos.length) await this.insertDestinos(circuitoId, destinos);
  }

  private async reemplazarHoteles(circuitoId: number, hoteles: Omit<CircuitoHotel, 'id'>[]) {
    await this.client.from('circuito_hoteles').delete().eq('circuito_id', circuitoId);
    if (hoteles.length) await this.insertHoteles(circuitoId, hoteles);
  }

  private async reemplazarActividades(circuitoId: number, actividades: Omit<CircuitoActividad, 'id'>[]) {
    await this.client.from('circuito_actividades').delete().eq('circuito_id', circuitoId);
    if (actividades.length) await this.insertActividades(circuitoId, actividades);
  }

  private async reemplazarImagenes(circuitoId: number, imagenes: Omit<CircuitoImagen, 'id'>[]) {
    await this.client.from('circuito_imagenes').delete().eq('circuito_id', circuitoId);
    if (imagenes.length) await this.insertImagenes(circuitoId, imagenes);
  }

  private async reemplazarTraducciones(circuitoId: number, traducciones: CircuitoTraduccion[]) {
    await this.client.from('circuito_traducciones').delete().eq('circuito_id', circuitoId);
    if (traducciones.length) await this.insertTraducciones(circuitoId, traducciones);
  }
}
