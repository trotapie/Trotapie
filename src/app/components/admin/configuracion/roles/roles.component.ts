import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SupabaseService } from 'app/core/supabase.service';
import { MaterialModule } from 'app/shared/material.module';

interface RolAdminItem {
  id: number;
  key: string;
  name: string;
}

interface PermisoDisponibleItem {
  id: number;
  key: string;
  description: string;
}

@Component({
  selector: 'app-roles-admin',
  imports: [MaterialModule, RouterLink, ReactiveFormsModule],
  templateUrl: './roles.component.html',
  styleUrl: './roles.component.scss',
})
export class RolesAdminComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly supabase = inject(SupabaseService);

  roles: RolAdminItem[] = [];
  rolesFiltrados: RolAdminItem[] = [];
  permisosDisponibles: PermisoDisponibleItem[] = [];
  permisosSeleccionados = new Set<number>();
  cargando = false;
  cargandoPermisos = false;
  guardando = false;
  eliminandoId: number | null = null;
  filtro = '';
  error = '';
  modalAbierto = false;
  modalEliminarAbierto = false;
  rolEditandoId: number | null = null;
  rolPendienteEliminar: RolAdminItem | null = null;

  readonly form = this.fb.nonNullable.group({
    key: ['', [Validators.required, Validators.maxLength(120)]],
    name: ['', [Validators.required, Validators.maxLength(120)]],
  });

  ngOnInit(): void {
    void Promise.all([this.cargarRoles(), this.cargarPermisos()]);
  }

  get estaEditando(): boolean {
    return this.rolEditandoId !== null;
  }

  aplicarFiltro(event: Event): void {
    this.filtro = String((event.target as HTMLInputElement)?.value ?? '').trim().toLowerCase();
    this.filtrarRoles();
  }

  async abrirModalNuevo(): Promise<void> {
    this.rolEditandoId = null;
    this.error = '';
    this.permisosSeleccionados = new Set<number>();
    this.form.reset({
      key: '',
      name: '',
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    await this.cargarPermisos();
    this.modalAbierto = true;
  }

  async editarRol(rol: RolAdminItem): Promise<void> {
    this.rolEditandoId = rol.id;
    this.error = '';
    this.form.reset({
      key: rol.key,
      name: rol.name,
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    await this.cargarPermisos();

    try {
      const ids = await this.supabase.permisosRolAdmin(rol.id);
      this.permisosSeleccionados = new Set(ids);
      this.modalAbierto = true;
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron cargar los permisos del rol.';
    }
  }

  cerrarModal(): void {
    if (this.guardando) {
      return;
    }

    this.modalAbierto = false;
    this.rolEditandoId = null;
    this.permisosSeleccionados = new Set<number>();
    this.form.reset({
      key: '',
      name: '',
    });
    this.error = '';
  }

  abrirModalEliminar(rol: RolAdminItem): void {
    this.rolPendienteEliminar = rol;
    this.error = '';
    this.modalEliminarAbierto = true;
  }

  cerrarModalEliminar(): void {
    if (this.eliminandoId !== null) {
      return;
    }

    this.modalEliminarAbierto = false;
    this.rolPendienteEliminar = null;
    this.error = '';
  }

  alternarPermiso(permissionId: number, checked: boolean): void {
    const siguientes = new Set(this.permisosSeleccionados);
    if (checked) {
      siguientes.add(permissionId);
    } else {
      siguientes.delete(permissionId);
    }
    this.permisosSeleccionados = siguientes;
  }

  permisoSeleccionado(permissionId: number): boolean {
    return this.permisosSeleccionados.has(permissionId);
  }

  async guardarRol(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando = true;
    this.error = '';

    const payload = {
      key: this.normalizarClave(this.form.getRawValue().key),
      name: String(this.form.getRawValue().name ?? '').trim(),
    };

    try {
      let roleId = this.rolEditandoId;

      if (this.estaEditando && this.rolEditandoId !== null) {
        await this.supabase.actualizarRolAdmin(this.rolEditandoId, payload);
      } else {
        const nuevoRol = await this.supabase.crearRolAdmin(payload);
        roleId = Number(nuevoRol.id);
      }

      if (!Number.isFinite(Number(roleId))) {
        throw new Error('No se pudo determinar el rol a actualizar.');
      }

      await this.supabase.guardarPermisosRolAdmin(Number(roleId), Array.from(this.permisosSeleccionados));

      this.cerrarModal();
      await this.cargarRoles();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo guardar el rol.';
    } finally {
      this.guardando = false;
    }
  }

  async confirmarEliminar(): Promise<void> {
    if (!this.rolPendienteEliminar) {
      return;
    }

    this.eliminandoId = this.rolPendienteEliminar.id;
    this.error = '';

    try {
      await this.supabase.eliminarRolAdmin(this.rolPendienteEliminar.id);
      this.cerrarModalEliminar();
      await this.cargarRoles();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo eliminar el rol.';
    } finally {
      this.eliminandoId = null;
    }
  }

  private async cargarRoles(): Promise<void> {
    this.cargando = true;
    this.error = '';

    try {
      const { data, error } = await this.supabase.rolesAdmin();
      if (error) throw error;

      this.roles = (data ?? []).map((item: any) => ({
        id: Number(item.id),
        key: String(item.key ?? ''),
        name: String(item.name ?? item.key ?? ''),
      }));
      this.filtrarRoles();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo cargar el concentrado de roles.';
    } finally {
      this.cargando = false;
    }
  }

  private async cargarPermisos(): Promise<void> {
    if (this.cargandoPermisos) {
      return;
    }

    this.cargandoPermisos = true;

    try {
      const { data, error } = await this.supabase.permisosAdmin();
      if (error) throw error;

      this.permisosDisponibles = (data ?? []).map((item: any) => ({
        id: Number(item.id),
        key: String(item.key ?? ''),
        description: String(item.description ?? ''),
      }));
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron cargar los permisos disponibles.';
    } finally {
      this.cargandoPermisos = false;
    }
  }

  private filtrarRoles(): void {
    if (!this.filtro) {
      this.rolesFiltrados = [...this.roles];
      return;
    }

    this.rolesFiltrados = this.roles.filter((rol) =>
      rol.key.toLowerCase().includes(this.filtro) ||
      rol.name.toLowerCase().includes(this.filtro) ||
      String(rol.id).includes(this.filtro)
    );
  }

  private normalizarClave(value: string): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
  }
}
