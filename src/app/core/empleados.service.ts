import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class EmpleadosService {
  private readonly supabase = inject(SupabaseService);

  private get client() {
    return this.supabase.getClient();
  }

  empleados(options?: { incluirInhabilitados?: boolean }) {
    let query = this.client
      .from('empleados')
      .select('id, nombre, cargo, telefono, estatus_id, email, auth_user_id, primera_vez_login')
      .order('id', { ascending: true });

    if (!options?.incluirInhabilitados) {
      query = query.or('estatus_id.is.null,estatus_id.eq.1');
    }

    return query;
  }

  async obtenerEstatusEmpleadoAdmin() {
    const { data, error } = await this.client
      .from('estatus_empleado')
      .select('id, clave, nombre, activo, orden')
      .order('orden', { ascending: true })
      .order('id', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  private async obtenerEstatusEmpleadoPorClave(clave: string): Promise<number> {
    const { data, error } = await this.client
      .from('estatus_empleado')
      .select('id')
      .eq('clave', clave)
      .eq('activo', true)
      .maybeSingle();

    if (error) throw error;
    if (!data?.id) {
      throw new Error(`No existe un estatus de empleado habilitado con la clave ${clave}.`);
    }
    return Number(data.id);
  }

  async guardarAccesoEmpleadoAdmin(payload: {
    empleadoId: number;
    email: string;
    nombre?: string;
    permissionIds?: number[];
    roleId?: number | null;
  }) {
    const { data, error } = await this.client.functions.invoke('empleados-auth', {
      body: {
        action: 'upsert',
        empleadoId: payload.empleadoId,
        email: payload.email,
        nombre: payload.nombre ?? '',
        permissionIds: payload.permissionIds ?? [],
        roleId: payload.roleId ?? null,
      }
    });

    if (error) throw error;
    if (data?.ok === false) throw new Error(data.message ?? 'No se pudo guardar el acceso del empleado.');
    return data;
  }

  async quitarAccesoEmpleadoAdmin(empleadoId: number) {
    const { data, error } = await this.client.functions.invoke('empleados-auth', {
      body: {
        action: 'remove',
        empleadoId,
      }
    });

    if (error) throw error;
    if (data?.ok === false) throw new Error(data.message ?? 'No se pudo quitar el acceso del empleado.');
    return data;
  }

  async completarPrimerLoginEmpleado(password: string) {
    const nextPassword = String(password ?? '').trim();
    if (nextPassword.length < 6) {
      throw new Error('La contrasena debe tener al menos 6 caracteres.');
    }

    const { error: updatePasswordError } = await this.client.auth.updateUser({
      password: nextPassword,
    });

    if (updatePasswordError) throw updatePasswordError;

    const { data, error } = await this.client.functions.invoke('empleados-auth', {
      body: {
        action: 'complete-first-login',
        password: nextPassword,
      }
    });

    if (error) throw error;
    if (data?.ok === false) throw new Error(data.message ?? 'No se pudo actualizar la contrasena.');

    await this.client.auth.refreshSession();
    return data;
  }

  async crearEmpleadoAdmin(payload: { nombre: string; cargo?: string; telefono?: string }) {
    const nombre = String(payload.nombre ?? '').trim();
    const cargo = String(payload.cargo ?? '').trim() || null;
    const telefono = String(payload.telefono ?? '').trim() || null;
    const estatusActivoId = await this.obtenerEstatusEmpleadoPorClave('activo');
    const { data, error } = await this.client
      .from('empleados')
      .insert({ nombre, cargo, telefono, estatus_id: estatusActivoId })
      .select('id, nombre, cargo, telefono, estatus_id, email, auth_user_id, primera_vez_login')
      .single();

    if (error) throw error;
    return data;
  }

  async actualizarEmpleadoAdmin(id: number, payload: { nombre: string; cargo?: string; telefono?: string }) {
    const nombre = String(payload.nombre ?? '').trim();
    const cargo = String(payload.cargo ?? '').trim() || null;
    const telefono = String(payload.telefono ?? '').trim() || null;
    const { data, error } = await this.client
      .from('empleados')
      .update({ nombre, cargo, telefono })
      .eq('id', id)
      .select('id, nombre, cargo, telefono, estatus_id, email, auth_user_id, primera_vez_login')
      .single();

    if (error) throw error;
    return data;
  }

  async actualizarEstatusEmpleadoAdmin(id: number, estatusId: number) {
    const { data, error } = await this.client
      .from('empleados')
      .update({ estatus_id: estatusId })
      .eq('id', id)
      .select('id, nombre, cargo, telefono, estatus_id, email, auth_user_id, primera_vez_login')
      .single();

    if (error) throw error;
    return data;
  }

  async eliminarEmpleadoAdmin(id: number) {
    const { error } = await this.client
      .from('empleados')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { deleted: 1 };
  }

  permisosAdmin() {
    return this.client
      .from('permissions')
      .select('id, key, description')
      .order('id', { ascending: true });
  }

  async crearPermisoAdmin(payload: { key: string; description: string }) {
    const { data, error } = await this.client
      .from('permissions')
      .insert({
        key: payload.key,
        description: payload.description,
      })
      .select('id, key, description')
      .single();

    if (error) throw error;
    return data;
  }

  async actualizarPermisoAdmin(id: number, payload: { key: string; description: string }) {
    const { data, error } = await this.client
      .from('permissions')
      .update({
        key: payload.key,
        description: payload.description,
      })
      .eq('id', id)
      .select('id, key, description')
      .single();

    if (error) throw error;
    return data;
  }

  async eliminarPermisoAdmin(id: number) {
    const { error } = await this.client
      .from('permissions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { deleted: 1 };
  }

  rolesAdmin() {
    return this.client
      .from('roles')
      .select('id, key, name')
      .order('id', { ascending: true });
  }

  async crearRolAdmin(payload: { key: string; name: string }) {
    const { data, error } = await this.client
      .from('roles')
      .insert({
        key: payload.key,
        name: payload.name,
      })
      .select('id, key, name')
      .single();

    if (error) throw error;
    return data;
  }

  async actualizarRolAdmin(id: number, payload: { key: string; name: string }) {
    const { data, error } = await this.client
      .from('roles')
      .update({
        key: payload.key,
        name: payload.name,
      })
      .eq('id', id)
      .select('id, key, name')
      .single();

    if (error) throw error;
    return data;
  }

  async eliminarRolAdmin(id: number) {
    const { error: rolePermissionsError } = await this.client
      .from('role_permissions')
      .delete()
      .eq('role_id', id);

    if (rolePermissionsError) throw rolePermissionsError;

    const { error } = await this.client
      .from('roles')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { deleted: 1 };
  }

  async permisosRolAdmin(roleId: number): Promise<number[]> {
    const { data, error } = await this.client
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', roleId);

    if (error) throw error;

    return (data ?? [])
      .map((item: any) => Number(item.permission_id))
      .filter((id) => Number.isFinite(id));
  }

  async guardarPermisosRolAdmin(roleId: number, permissionIds: number[]) {
    const idsUnicos = [...new Set(permissionIds)]
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));

    const { error: deleteError } = await this.client
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId);

    if (deleteError) throw deleteError;

    if (!idsUnicos.length) {
      return [];
    }

    const payload = idsUnicos.map((permissionId) => ({
      role_id: roleId,
      permission_id: permissionId,
    }));

    const { data, error } = await this.client
      .from('role_permissions')
      .insert(payload)
      .select('role_id, permission_id');

    if (error) throw error;
    return data ?? [];
  }

  async rolesEmpleadoAdmin(empleadoId: number): Promise<number[]> {
    const { data: empleado, error: empleadoError } = await this.client
      .from('empleados')
      .select('auth_user_id')
      .eq('id', empleadoId)
      .maybeSingle();

    if (empleadoError) throw empleadoError;

    const userId = String(empleado?.auth_user_id ?? '').trim();
    if (!userId) {
      return [];
    }

    const { data: profile, error: profileError } = await this.client
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) throw profileError;

    const roleKey = String(profile?.role ?? '').trim();
    if (!roleKey) {
      return [];
    }

    const { data: role, error: roleError } = await this.client
      .from('roles')
      .select('id')
      .eq('key', roleKey)
      .maybeSingle();

    if (roleError) throw roleError;

    return role?.id ? [Number(role.id)] : [];
  }

  async permisosEmpleadoAdmin(empleadoId: number): Promise<number[]> {
    const { data: empleado, error: empleadoError } = await this.client
      .from('empleados')
      .select('auth_user_id')
      .eq('id', empleadoId)
      .maybeSingle();

    if (empleadoError) throw empleadoError;

    const userId = String(empleado?.auth_user_id ?? '').trim();
    if (!userId) {
      return [];
    }

    const { data: profile, error: profileError } = await this.client
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) throw profileError;

    const roleKey = String(profile?.role ?? '').trim();
    if (!roleKey) {
      return [];
    }

    const { data: role, error: roleError } = await this.client
      .from('roles')
      .select('id')
      .eq('key', roleKey)
      .maybeSingle();

    if (roleError) throw roleError;
    if (!role?.id) return [];

    const { data, error } = await this.client
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', role.id);

    if (error) throw error;

    return (data ?? [])
      .map((item: any) => Number(item.permission_id))
      .filter((id) => Number.isFinite(id));
  }
}
