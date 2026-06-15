import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SupabaseService } from 'app/core/supabase.service';
import { MaterialModule } from 'app/shared/material.module';

interface PermisoAdminItem {
  id: number;
  key: string;
  description: string;
}

@Component({
  selector: 'app-permisos-admin',
  imports: [MaterialModule, RouterLink, ReactiveFormsModule],
  templateUrl: './permisos.component.html',
  styleUrl: './permisos.component.scss',
})
export class PermisosAdminComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly supabase = inject(SupabaseService);

  permisos: PermisoAdminItem[] = [];
  permisosFiltrados: PermisoAdminItem[] = [];
  cargando = false;
  guardando = false;
  eliminandoId: number | null = null;
  filtro = '';
  error = '';
  modalAbierto = false;
  modalEliminarAbierto = false;
  permisoEditandoId: number | null = null;
  permisoPendienteEliminar: PermisoAdminItem | null = null;

  readonly form = this.fb.nonNullable.group({
    key: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.maxLength(180)]],
  });

  ngOnInit(): void {
    void this.cargarPermisos();
  }

  get estaEditando(): boolean {
    return this.permisoEditandoId !== null;
  }

  aplicarFiltro(event: Event): void {
    this.filtro = String((event.target as HTMLInputElement)?.value ?? '').trim().toLowerCase();
    this.filtrarPermisos();
  }

  abrirModalNuevo(): void {
    this.permisoEditandoId = null;
    this.error = '';
    this.form.reset({
      key: '',
      description: '',
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.modalAbierto = true;
  }

  editarPermiso(permiso: PermisoAdminItem): void {
    this.permisoEditandoId = permiso.id;
    this.error = '';
    this.form.reset({
      key: permiso.key,
      description: permiso.description,
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    if (this.guardando) {
      return;
    }

    this.modalAbierto = false;
    this.permisoEditandoId = null;
    this.form.reset({
      key: '',
      description: '',
    });
    this.error = '';
  }

  abrirModalEliminar(permiso: PermisoAdminItem): void {
    this.permisoPendienteEliminar = permiso;
    this.error = '';
    this.modalEliminarAbierto = true;
  }

  cerrarModalEliminar(): void {
    if (this.eliminandoId !== null) {
      return;
    }

    this.modalEliminarAbierto = false;
    this.permisoPendienteEliminar = null;
    this.error = '';
  }

  async guardarPermiso(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando = true;
    this.error = '';

    const payload = {
      key: this.normalizarClave(this.form.getRawValue().key),
      description: String(this.form.getRawValue().description ?? '').trim(),
    };

    try {
      if (this.estaEditando && this.permisoEditandoId !== null) {
        await this.supabase.actualizarPermisoAdmin(this.permisoEditandoId, payload);
      } else {
        await this.supabase.crearPermisoAdmin(payload);
      }

      this.cerrarModal();
      await this.cargarPermisos();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo guardar el permiso.';
    } finally {
      this.guardando = false;
    }
  }

  async confirmarEliminar(): Promise<void> {
    if (!this.permisoPendienteEliminar) {
      return;
    }

    this.eliminandoId = this.permisoPendienteEliminar.id;
    this.error = '';

    try {
      await this.supabase.eliminarPermisoAdmin(this.permisoPendienteEliminar.id);
      this.cerrarModalEliminar();
      await this.cargarPermisos();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo eliminar el permiso.';
    } finally {
      this.eliminandoId = null;
    }
  }

  private async cargarPermisos(): Promise<void> {
    this.cargando = true;
    this.error = '';

    try {
      const { data, error } = await this.supabase.permisosAdmin();
      if (error) throw error;

      this.permisos = (data ?? []).map((item: any) => ({
        id: Number(item.id),
        key: String(item.key ?? ''),
        description: String(item.description ?? ''),
      }));
      this.filtrarPermisos();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo cargar el concentrado de permisos.';
    } finally {
      this.cargando = false;
    }
  }

  private filtrarPermisos(): void {
    if (!this.filtro) {
      this.permisosFiltrados = [...this.permisos];
      return;
    }

    this.permisosFiltrados = this.permisos.filter((permiso) =>
      permiso.key.toLowerCase().includes(this.filtro) ||
      permiso.description.toLowerCase().includes(this.filtro) ||
      String(permiso.id).includes(this.filtro)
    );
  }

  private normalizarClave(value: string): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
  }
}
