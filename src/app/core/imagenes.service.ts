import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class ImagenesService {
  private readonly supabase = inject(SupabaseService);

  private get client() {
    return this.supabase.getClient();
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

  async obtenerTiposImagenAdmin() {
    const { data, error } = await this.client
      .from('tipos_imagen')
      .select(`
        id,
        clave,
        orden,
        traducciones:tipos_imagen_traducciones!fk_tipo_imagen (
          lang,
          descripcion
        )
      `)
      .order('orden', { ascending: true })
      .order('id', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((item: any) => {
      const traduccionEs = item?.traducciones?.find((x: any) => String(x.lang).toLowerCase() === 'es');
      return {
        id: Number(item.id),
        clave: item.clave ?? '',
        descripcion: traduccionEs?.descripcion ?? item.clave ?? `Tipo ${item.id}`,
        orden: item.orden ?? null
      };
    });
  }
}
