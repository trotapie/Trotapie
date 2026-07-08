import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { construirNombreClienteVisible } from './cliente-nombre.util';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly supabase = inject(SupabaseService);

  private get client() {
    return this.supabase.getClient();
  }

  clientsRegister() {
    return this.client
      .from('clientes')
      .select('*')
  }

  async buscarClientes(filtros: {
    nombre?: string | null;
    email?: string | null;
    telefono?: string | null;
  }) {
    let query = this.client
      .from('clientes')
      .select(`
        id,
        nombre,
        nombre_completo,
        tratamiento_id,
        email,
        telefono,
        recibir_ofertas,
        tratamiento:tratamiento_id (
          id,
          nombre,
          abreviacion
        )
      `)
      .order('nombre', { ascending: true })
      .limit(100);

    const nombre = String(filtros?.nombre ?? '').trim();
    const email = String(filtros?.email ?? '').trim();
    const telefono = String(filtros?.telefono ?? '').trim();

    if (nombre) {
      query = query.ilike('nombre', `%${nombre}%`);
    }
    if (email) {
      query = query.ilike('email', `%${email}%`);
    }
    if (telefono) {
      query = query.ilike('telefono', `%${telefono}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((item: any) => ({
      ...item,
      nombre: construirNombreClienteVisible({
        tratamientoAbreviacion: item?.tratamiento?.abreviacion ?? null,
        nombreCompleto: item?.nombre_completo ?? null,
        nombreFallback: item?.nombre ?? null,
      })
    }));
  }

  async upsertCliente(cliente: {
    nombre: string;
    nombre_completo: string;
    tratamiento_id: number | null;
    email: string | null;
    telefono: string;
    recibir_ofertas: boolean;
  }) {
    const { data, error } = await this.client
      .from('clientes')
      .upsert(cliente, { onConflict: 'telefono' })
      .select(`
        id,
        nombre,
        nombre_completo,
        tratamiento_id,
        email,
        telefono,
        recibir_ofertas,
        tratamiento:tratamiento_id (
          id,
          nombre,
          abreviacion
        )
      `)
      .single();

    if (error) throw error;
    return data;
  }
}
