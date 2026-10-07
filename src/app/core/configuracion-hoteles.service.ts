import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { HotelHorarios, normalizarHorarios } from 'app/components/hoteles/hotel-estancia.interface';

export interface HotelTextosEncabezado {
  titulo?: string;
  destacado?: string;
  mensaje?: string;
}

export interface ConfiguracionHoteles {
  horarios: HotelHorarios | null;
  textos: Record<string, HotelTextosEncabezado>;
}

@Injectable({ providedIn: 'root' })
export class ConfiguracionHotelesService {
  private readonly supabase = inject(SupabaseService);

  async obtener(): Promise<ConfiguracionHoteles> {
    const { data, error } = await this.supabase.getClient()
      .from('configuracion_hoteles').select('horarios, textos').eq('id', 1).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('No existe el registro de configuración global de hoteles. Aplica la migración correspondiente.');
    return { horarios: normalizarHorarios(data.horarios), textos: this.normalizarTextos(data.textos) };
  }

  async guardar(configuracion: ConfiguracionHoteles): Promise<void> {
    const { data, error } = await this.supabase.getClient().from('configuracion_hoteles')
      .update({ horarios: normalizarHorarios(configuracion.horarios), textos: this.normalizarTextos(configuracion.textos) })
      .eq('id', 1).select('id').single();
    if (error) throw error;
    if (!data) throw new Error('No se pudo actualizar la configuración global.');
  }

  textosParaIdioma(configuracion: ConfiguracionHoteles | null, idioma: string): HotelTextosEncabezado {
    // Una traducción ausente conserva el texto original de Transloco en ese idioma.
    return configuracion?.textos[idioma] ?? {};
  }

  private normalizarTextos(value: unknown): Record<string, HotelTextosEncabezado> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const resultado: Record<string, HotelTextosEncabezado> = {};
    for (const [idioma, contenido] of Object.entries(value)) {
      if (!contenido || typeof contenido !== 'object' || Array.isArray(contenido)) continue;
      const texto: HotelTextosEncabezado = {};
      for (const campo of ['titulo', 'destacado', 'mensaje'] as const) {
        const valor = (contenido as Record<string, unknown>)[campo];
        if (typeof valor === 'string' && valor.trim()) texto[campo] = valor.trim();
      }
      resultado[idioma] = texto;
    }
    return resultado;
  }
}
