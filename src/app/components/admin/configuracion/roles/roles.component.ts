import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EmpleadosService } from 'app/core/empleados.service';
import { backdropFade, fadeSlideIn, modalScaleFade } from 'app/shared/animations';
import { MaterialModule } from 'app/shared/material.module';
import { TpInputComponent } from 'app/shared/tp-input/tp-input.component';
import { TpSearchInputComponent } from 'app/shared/tp-search-input/tp-search-input.component';
import { TpToastService } from 'app/shared/tp-toast/tp-toast.service';

interface RolAdminItem {
  id: number;
  key: string;
  name: string;
}

interface PermisoDisponibleItem {
  id: number;
  key: string;
  description: string;
  modulo: string;
}

export interface GrupoPermisosItem {
  modulo: string;
  permisos: PermisoDisponibleItem[];
}

@Component({
  selector: 'app-roles-admin',
  standalone: true,
  imports: [
    MaterialModule,
    RouterLink,
    ReactiveFormsModule,
    TpInputComponent,
    TpSearchInputComponent,
  ],
  templateUrl: './roles.component.html',
  styleUrl: './roles.component.scss',
  animations: [modalScaleFade, backdropFade, fadeSlideIn],
})
export class RolesAdminComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly supabase = inject(EmpleadosService);
  private readonly toast = inject(TpToastService);

  roles: RolAdminItem[] = [];
  permisos: PermisoDisponibleItem[] = [];
  permisosFiltrados: PermisoDisponibleItem[] = [];
  permisosPorRol = new Map<number, Set<number>>();
  rolesConCambios = new Set<number>();
  cargando = false;
  guardando = false;
  eliminandoId: number | null = null;
  filtro = '';
  moduloSeleccionado = 'todos';
  error = '';
  exito = '';
  modalRolAbierto = false;
  modalEliminarAbierto = false;
  rolEditando: RolAdminItem | null = null;
  rolPendienteEliminar: RolAdminItem | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
  });

  ngOnInit(): void {
    void this.cargarMatriz();
  }

  get hayCambios(): boolean {
    return this.rolesConCambios.size > 0;
  }

  get estaEditando(): boolean {
    return this.rolEditando !== null;
  }

  get totalPermisos(): number {
    return this.permisos.length;
  }

  get rolesConCambiosList(): RolAdminItem[] {
    return this.roles.filter((r) => this.rolesConCambios.has(r.id));
  }

  get modulosDisponibles(): { name: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const p of this.permisos) {
      counts.set(p.modulo, (counts.get(p.modulo) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  get gruposPermisos(): GrupoPermisosItem[] {
    const gruposMap = new Map<string, PermisoDisponibleItem[]>();
    for (const permiso of this.permisosFiltrados) {
      if (!gruposMap.has(permiso.modulo)) {
        gruposMap.set(permiso.modulo, []);
      }
      gruposMap.get(permiso.modulo)!.push(permiso);
    }
    return Array.from(gruposMap.entries()).map(([modulo, permisos]) => ({
      modulo,
      permisos,
    }));
  }

  esAdministrador(rol: RolAdminItem): boolean {
    return rol.key.toLowerCase() === 'admin';
  }

  conteoPermisosRol(roleId: number): number {
    return this.permisosPorRol.get(roleId)?.size ?? 0;
  }

  onSearch(query: string): void {
    this.filtro = String(query ?? '').trim().toLowerCase();
    this.filtrarPermisos();
  }

  seleccionarModulo(modulo: string): void {
    this.moduloSeleccionado = modulo;
    this.filtrarPermisos();
  }

  limpiarFiltros(): void {
    this.filtro = '';
    this.moduloSeleccionado = 'todos';
    this.filtrarPermisos();
  }

  tienePermiso(roleId: number, permissionId: number): boolean {
    return this.permisosPorRol.get(roleId)?.has(permissionId) ?? false;
  }

  alternarPermiso(roleId: number, permissionId: number, checked: boolean): void {
    const permisos = new Set(this.permisosPorRol.get(roleId) ?? []);
    checked ? permisos.add(permissionId) : permisos.delete(permissionId);
    this.permisosPorRol.set(roleId, permisos);
    this.rolesConCambios = new Set(this.rolesConCambios).add(roleId);
    this.exito = '';
  }

  todosConcedidosEnModulo(modulo: string, roleId: number): boolean {
    const permisosModulo = this.permisos.filter((p) => p.modulo === modulo);
    if (permisosModulo.length === 0) return false;
    const asignados = this.permisosPorRol.get(roleId);
    if (!asignados) return false;
    return permisosModulo.every((p) => asignados.has(p.id));
  }

  algunoConcedidoEnModulo(modulo: string, roleId: number): boolean {
    const permisosModulo = this.permisos.filter((p) => p.modulo === modulo);
    const asignados = this.permisosPorRol.get(roleId);
    if (!asignados) return false;
    return permisosModulo.some((p) => asignados.has(p.id));
  }

  alternarTodosModulo(modulo: string, roleId: number): void {
    const rol = this.roles.find((r) => r.id === roleId);
    if (!rol || this.esAdministrador(rol)) return;

    const permisosModulo = this.permisos.filter((p) => p.modulo === modulo);
    if (permisosModulo.length === 0) return;

    const estanTodos = this.todosConcedidosEnModulo(modulo, roleId);
    const asignados = new Set(this.permisosPorRol.get(roleId) ?? []);

    for (const p of permisosModulo) {
      if (estanTodos) {
        asignados.delete(p.id);
      } else {
        asignados.add(p.id);
      }
    }

    this.permisosPorRol.set(roleId, asignados);
    this.rolesConCambios = new Set(this.rolesConCambios).add(roleId);
    this.exito = '';
  }

  abrirModalNuevo(): void {
    this.rolEditando = null;
    this.error = '';
    this.form.reset({ name: '' });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.modalRolAbierto = true;
  }

  abrirModalEditar(rol: RolAdminItem): void {
    if (this.esAdministrador(rol)) return;
    this.rolEditando = rol;
    this.error = '';
    this.form.reset({ name: rol.name });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.modalRolAbierto = true;
  }

  cerrarModalRol(forzar = false): void {
    if (this.guardando && !forzar) return;
    this.modalRolAbierto = false;
    this.rolEditando = null;
    this.error = '';
  }

  async guardarRol(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = {
      key: this.rolEditando?.key ?? this.normalizarClave(this.form.getRawValue().name),
      name: String(this.form.getRawValue().name).trim(),
    };

    if (!this.rolEditando && payload.key === 'admin') {
      this.error = 'La clave admin está reservada para el rol administrador protegido.';
      return;
    }

    this.guardando = true;
    this.error = '';
    try {
      if (this.rolEditando) {
        await this.supabase.actualizarRolAdmin(this.rolEditando.id, payload);
        this.toast.show({
          title: 'Rol actualizado',
          message: `El rol "${payload.name}" se actualizó correctamente.`,
          variant: 'success',
        });
      } else {
        await this.supabase.crearRolAdmin(payload);
        this.toast.show({
          title: 'Rol creado',
          message: `El rol "${payload.name}" fue creado. Ahora puedes asignarle permisos en la matriz.`,
          variant: 'success',
        });
      }
      this.cerrarModalRol(true);
      await this.cargarMatriz();
      this.exito = 'Rol guardado correctamente.';
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo guardar el rol.';
      this.toast.show({
        title: 'Error al guardar rol',
        message: this.error,
        variant: 'error',
      });
    } finally {
      this.guardando = false;
    }
  }

  abrirModalEliminar(rol: RolAdminItem): void {
    if (this.esAdministrador(rol)) return;
    this.rolPendienteEliminar = rol;
    this.error = '';
    this.modalEliminarAbierto = true;
  }

  cerrarModalEliminar(forzar = false): void {
    if (this.eliminandoId !== null && !forzar) return;
    this.modalEliminarAbierto = false;
    this.rolPendienteEliminar = null;
    this.error = '';
  }

  async confirmarEliminar(): Promise<void> {
    if (!this.rolPendienteEliminar) return;
    const rolNombre = this.rolPendienteEliminar.name;
    this.eliminandoId = this.rolPendienteEliminar.id;
    this.error = '';
    try {
      await this.supabase.eliminarRolAdmin(this.rolPendienteEliminar.id);
      this.cerrarModalEliminar(true);
      await this.cargarMatriz();
      this.toast.show({
        title: 'Rol eliminado',
        message: `El rol "${rolNombre}" y sus permisos fueron eliminados.`,
        variant: 'success',
      });
      this.exito = 'Rol eliminado correctamente.';
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo eliminar el rol.';
      this.toast.show({
        title: 'Error al eliminar',
        message: this.error,
        variant: 'error',
      });
    } finally {
      this.eliminandoId = null;
    }
  }

  descartarCambios(): void {
    if (!this.hayCambios || this.guardando) return;
    void this.cargarMatriz();
    this.toast.show({
      title: 'Cambios descartados',
      message: 'Se han restablecido los permisos originales.',
      variant: 'info',
    });
  }

  async guardarCambios(): Promise<void> {
    if (!this.hayCambios || this.guardando) return;
    this.guardando = true;
    this.error = '';
    this.exito = '';
    try {
      for (const roleId of Array.from(this.rolesConCambios)) {
        await this.supabase.guardarPermisosRolAdmin(
          roleId,
          Array.from(this.permisosPorRol.get(roleId) ?? [])
        );
        this.rolesConCambios.delete(roleId);
      }
      this.rolesConCambios = new Set(this.rolesConCambios);
      this.exito = 'Los permisos se actualizaron correctamente.';
      this.toast.show({
        title: 'Permisos actualizados',
        message: 'Todos los cambios de permisos han sido guardados con éxito.',
        variant: 'success',
      });
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron guardar todos los cambios.';
      this.toast.show({
        title: 'Error al guardar',
        message: this.error,
        variant: 'error',
      });
    } finally {
      this.guardando = false;
    }
  }

  private async cargarMatriz(): Promise<void> {
    this.cargando = true;
    this.error = '';
    try {
      const [rolesResult, permisosResult, relaciones] = await Promise.all([
        this.supabase.rolesAdmin(),
        this.supabase.permisosAdmin(),
        this.supabase.relacionesPermisosRolAdmin(),
      ]);
      if (rolesResult.error) throw rolesResult.error;
      if (permisosResult.error) throw permisosResult.error;

      this.roles = (rolesResult.data ?? []).map((item: any) => ({
        id: Number(item.id),
        key: String(item.key ?? ''),
        name: String(item.name ?? item.key ?? ''),
      }));
      this.permisos = (permisosResult.data ?? []).map((item: any) => {
        const key = String(item.key ?? '');
        return {
          id: Number(item.id),
          key,
          description: String(item.description ?? ''),
          modulo: this.obtenerModulo(key),
        };
      });
      this.permisosPorRol = new Map(
        this.roles.map((rol) => [rol.id, new Set<number>()])
      );
      relaciones.forEach(({ role_id, permission_id }) =>
        this.permisosPorRol.get(role_id)?.add(permission_id)
      );
      this.rolesConCambios = new Set<number>();
      this.filtrarPermisos();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo cargar la matriz de permisos.';
      this.toast.show({
        title: 'Error de carga',
        message: this.error,
        variant: 'error',
      });
    } finally {
      this.cargando = false;
    }
  }

  private filtrarPermisos(): void {
    this.permisosFiltrados = this.permisos.filter((permiso) => {
      const coincideModulo =
        this.moduloSeleccionado === 'todos' ||
        permiso.modulo.toLowerCase() === this.moduloSeleccionado.toLowerCase();

      if (!coincideModulo) return false;

      if (!this.filtro) return true;

      return (
        permiso.key.toLowerCase().includes(this.filtro) ||
        permiso.description.toLowerCase().includes(this.filtro) ||
        permiso.modulo.toLowerCase().includes(this.filtro)
      );
    });
  }

  private obtenerModulo(key: string): string {
    const modulo = key.split('.')[0]?.replace(/[_-]/g, ' ') ?? 'General';
    return modulo.charAt(0).toUpperCase() + modulo.slice(1);
  }

  private normalizarClave(value: string): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
  }
}
