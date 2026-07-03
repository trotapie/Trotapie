import { inject, Injectable } from '@angular/core';
import { SupabaseService } from 'app/core/supabase.service';
import { FlyerSavedConfig, FlyerTemplate, FlyerTemplateConfig } from '../models/flyer-template.interface';
import { PRESET_FLYER_TEMPLATES } from '../templates/preset-templates';

@Injectable({ providedIn: 'root' })
export class FlyerTemplateService {
  private readonly supabase = inject(SupabaseService);

  private get client() {
    return this.supabase.getClient();
  }

  async listarPlantillas(activoOnly = true) {
    try {
      let query = this.client
        .from('flyer_plantillas')
        .select('id, nombre, descripcion, orientacion, ancho, alto, thumbnail, categoria, activo, created_at, config')
        .order('nombre', { ascending: true });

      if (activoOnly) {
        query = query.eq('activo', true);
      }

      const { data, error } = await query;
      if (error) throw error;

      const templates = (data ?? []).map((item: any) => ({
        ...item,
        config: typeof item.config === 'string' ? JSON.parse(item.config) : item.config,
      })) as FlyerTemplate[];

      if (templates.length) {
        return templates;
      }
    } catch {
      // Fall back to local presets when the table is empty or unavailable.
    }

    return this.obtenerPlantillasPreset(activoOnly);
  }

  async obtenerPlantilla(id: number) {
    try {
      const { data, error } = await this.client
        .from('flyer_plantillas')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        return {
          ...data,
          config: typeof data.config === 'string' ? JSON.parse(data.config) : data.config
        } as FlyerTemplate;
      }
    } catch {
      // Local preset fallback below.
    }

    return this.obtenerPlantillasPreset(false).find((template) => template.id === id) ?? null;
  }

  async guardarPlantilla(payload: {
    nombre: string;
    descripcion: string;
    orientacion: string;
    ancho: number;
    alto: number;
    thumbnail: string;
    categoria: string;
    config: FlyerTemplateConfig;
  }) {
    const { data, error } = await this.client
      .from('flyer_plantillas')
      .insert({
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        orientacion: payload.orientacion,
        ancho: payload.ancho,
        alto: payload.alto,
        thumbnail: payload.thumbnail,
        categoria: payload.categoria,
        config: JSON.stringify(payload.config)
      })
      .select('id')
      .single();

    if (error) throw error;
    return data;
  }

  async actualizarPlantilla(id: number, payload: Partial<{
    nombre: string;
    descripcion: string;
    orientacion: string;
    ancho: number;
    alto: number;
    thumbnail: string;
    categoria: string;
    config: FlyerTemplateConfig;
    activo: boolean;
  }>) {
    const dbPayload: Record<string, any> = { ...payload };
    if (payload.config) {
      dbPayload.config = JSON.stringify(payload.config);
    }

    const { error } = await this.client
      .from('flyer_plantillas')
      .update(dbPayload)
      .eq('id', id);

    if (error) throw error;
  }

  async eliminarPlantilla(id: number) {
    const { error } = await this.client
      .from('flyer_plantillas')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async guardarFlyerCircuito(circuitoId: number, plantillaId: number | null, config: FlyerTemplateConfig) {
    const { data: existente, error: queryError } = await this.client
      .from('circuito_flyers')
      .select('id')
      .eq('circuito_id', circuitoId)
      .maybeSingle();

    if (queryError) throw queryError;

    const payload = {
      circuito_id: circuitoId,
      plantilla_id: plantillaId,
      config: JSON.stringify(config)
    };

    if (existente) {
      const { error } = await this.client
        .from('circuito_flyers')
        .update(payload)
        .eq('id', existente.id);

      if (error) throw error;
      return existente.id;
    }

    const { data, error } = await this.client
      .from('circuito_flyers')
      .insert(payload)
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  async obtenerFlyerCircuito(circuitoId: number) {
    const { data, error } = await this.client
      .from('circuito_flyers')
      .select('*')
      .eq('circuito_id', circuitoId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      ...data,
      config: typeof data.config === 'string' ? JSON.parse(data.config) : data.config
    } as FlyerSavedConfig;
  }

  private obtenerPlantillasPreset(activoOnly: boolean) {
    return PRESET_FLYER_TEMPLATES
      .filter((template) => !activoOnly || template.activo !== false)
      .map((template) => ({
        ...template,
        config: structuredClone(template.config)
      }));
  }
}
