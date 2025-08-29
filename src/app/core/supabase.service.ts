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
  listHotelesAll() {
    return this.client
      .from('hoteles')
      .select('*')
      .order('created_at', { ascending: false }); // opcional
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
