import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class TraduccionesService {
  private readonly supabase = inject(SupabaseService);

  private readonly traduccionEndpoint =
    'https://script.google.com/macros/s/AKfycbwJ64gxjQiSsfZzixzr0tIe1na6tM81oAAW9Cjt8uuI53DDSaaAn_UMl2zgU69ZYyg3/exec';

  private get client() {
    return this.supabase.getClient();
  }

  async traducirDesdeEspanol(payload: { title: string; description: string }) {
    const response = await fetch(this.traduccionEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        title: payload.title ?? '',
        description: payload.description ?? ''
      })
    });

    if (!response.ok) {
      throw new Error('No se pudo traducir el contenido.');
    }

    const data = await response.json();
    const traducciones = data?.data;
    return traducciones && typeof traducciones === 'object' ? traducciones : {};
  }

  async traducirPoliticaDesdeEspanol(payload: { title: string; description: string }) {
    return this.traducirDesdeEspanol(payload);
  }
}
