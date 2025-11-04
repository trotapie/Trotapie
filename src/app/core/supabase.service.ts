import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }

  // ===== AUTH =====
  getSession() { return this.client.auth.getSession(); }
  onAuth(cb: Parameters<SupabaseClient['auth']['onAuthStateChange']>[0]) {
    return this.client.auth.onAuthStateChange(cb);
  }
  signUp(email: string, password: string) {
    return this.client.auth.signUp({ email, password });
  }
  signIn(email: string, password: string) {
    return this.client.auth.signInWithPassword({ email, password }); // v2
  }
  signOut() { return this.client.auth.signOut(); }

  // ===== DB (PostgREST) =====
  listHotelesAll(nombreDestino: string) {
    return this.client
      .from('hoteles')
      .select(`
      id, created_at, nombre_hotel, descripcion, estrellas, fondo, orden, ubicacion,
      descuento:descuento_id ( id, tipo_descuento ),
      destinos:destino_id!inner ( id, nombre ),
      concepto:concepto_id ( id, descripcion ),
      regimen:regimen_id ( id, descripcion )
    `)
      .eq('destinos.nombre', `${nombreDestino}`)
      .order('orden', { ascending: true });
  }

  infoHotel(idHotel: number) {
    return this.client
      .from('hoteles')
      .select(`
      id,
      nombre_hotel,
      descripcion,
      ubicacion,
      imagenes:imagenes_hoteles!imagenes_hoteles_hotel_id_fkey ( url_imagen ),
      actividades:actividades_hotel!actividades_hotel_hotel_id_fkey (
        actividad:actividades!actividades_hotel_actividad_id_fkey ( id, descripcion )
      ),
      regimenes:regimen_hotel!regimen_hotel_hotel_id_fkey (
        regimen:regimen!regimen_hotel_regimen_id_fkey ( id, descripcion )
      )
    `)
      .eq('id', idHotel)
      .maybeSingle();
  }



  empleados() {
    return this.client
      .from('empleados')
      .select('*')
      .order('id', { ascending: true });
  }

  obtenerDestinos(id: number) {
    return this.client
      .from('destinos')
      .select('id, nombre, orden')
      .eq('tipo_desino_id', id)
      .order('orden', { ascending: true });
  }


  clientsRegister() {
    return this.client
      .from('clientes')
      .select('*')
  }

  async upsertCliente(cliente: {
    nombre: string;
    email: string;
    telefono: string;
    recibir_ofertas: boolean;
  }) {
    const { data, error } = await this.client
      .from('clientes')
      .upsert(cliente, { onConflict: 'telefono' })
      .select();

    if (error) {
      console.error('Error al hacer upsert:', error);
      throw error;
    }
    return data;
  }

  addHotel(payload: { nombre: string; ciudad: string; descripcion?: string }) {
    return this.client.from('hoteles').insert(payload).single();
  }

  // ===== REALTIME (DB changes) =====
  subscribeHotelesChanges(handler: (payload: any) => void) {
    const ch = this.client
      .channel('room:hoteles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hoteles' }, handler)
      .subscribe();
    return () => { this.client.removeChannel(ch); };
  }

  // ===== STORAGE =====
  uploadHotelImage(hotelId: string, file: File) {
    const path = `${hotelId}/${Date.now()}_${file.name}`;
    return this.client.storage.from('hoteles').upload(path, file);
  }

  getPublicUrl(path: string) {
    return this.client.storage.from('hoteles').getPublicUrl(path);
  }
}
