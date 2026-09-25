import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { TraduccionesService } from './traducciones.service';

export interface CatalogoPestanaHotel {
  id: number;
  titulo_es: string;
  icono: string;
  activo: boolean;
  traducciones: Array<{ idioma_id: number; titulo: string }>;
}

@Injectable({ providedIn: 'root' })
export class CatalogoPestanasHotelService {
  private readonly supabase = inject(SupabaseService);
  private readonly traducciones = inject(TraduccionesService);

  async obtener(): Promise<CatalogoPestanaHotel[]> {
    const { data, error } = await this.supabase.getClient().from('catalogo_pestanas_hotel')
      .select('id, titulo_es, icono, activo, traducciones:catalogo_pestanas_hotel_traducciones(idioma_id, titulo)')
      .order('titulo_es');
    if (error) throw error;
    return (data ?? []) as CatalogoPestanaHotel[];
  }

  async guardar(pestana: Pick<CatalogoPestanaHotel, 'titulo_es' | 'icono' | 'activo'> & { id?: number }): Promise<void> {
    const titulo_es = pestana.titulo_es.trim().replace(/\s+/g, ' ');
    if (!titulo_es) throw new Error('Escribe el nombre de la pestaña.');
    const actual = pestana.id ? (await this.obtener()).find((item) => item.id === pestana.id) : undefined;
    const cambioTitulo = actual?.titulo_es !== titulo_es;
    const idiomas = cambioTitulo ? await this.supabase.obtenerIdiomasPreviewAdmin() : [];
    const traducidos = cambioTitulo && idiomas.some((item) => item.codigo !== 'es')
      ? await this.traducciones.traducirDesdeEspanol({ title: titulo_es, description: '' }) : {};
    const nombres = idiomas.map((idioma) => ({
      idioma_id: idioma.id,
      titulo: idioma.codigo === 'es' ? titulo_es : traducidos?.[idioma.codigo]?.title
    }));
    if (nombres.some((item) => typeof item.titulo !== 'string' || !item.titulo.trim())) {
      throw new Error('No se pudieron traducir los nombres del catálogo. Intenta de nuevo.');
    }

    const { error } = await this.supabase.getClient().rpc('guardar_catalogo_pestana_hotel', {
      p_id: pestana.id ?? null,
      p_titulo_es: titulo_es,
      p_icono: pestana.icono,
      p_activo: pestana.activo,
      p_traducciones: nombres
    });
    if (error) throw error;
  }
}
