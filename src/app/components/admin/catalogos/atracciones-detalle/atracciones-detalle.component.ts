import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogosAdminService } from 'app/core/catalogos-admin.service';
import { EstatusComponent } from 'app/shared/estatus/estatus.component';
import { MaterialModule } from 'app/shared/material.module';
import { CustomSwitchComponent } from 'app/shared/custom-switch/custom-switch.component';

@Component({
  selector: 'app-atracciones-detalle',
  standalone: true,
  imports: [CommonModule, MaterialModule, RouterLink, FormsModule, EstatusComponent, CustomSwitchComponent],
  templateUrl: './atracciones-detalle.component.html',
  styleUrl: './atracciones-detalle.component.scss'
})
export class AtraccionesDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogosAdmin = inject(CatalogosAdminService);

  loading = false;
  guardando = false;
  error = '';
  catalogo: any = null;
  atracciones: any[] = [];
  displayedColumns = ['id', 'nombre', 'descripcion', 'imagenes', 'orden', 'activo', 'acciones'];
  editingId: number | null = null;
  editingDraft: Record<string, any> = {};

  async ngOnInit() {
    const idRaw = this.route.snapshot.paramMap.get('id');
    const catalogoId = Number(idRaw);

    if (!idRaw || !Number.isFinite(catalogoId)) {
      this.error = 'No se encontro el catalogo solicitado.';
      return;
    }

    this.loading = true;
    this.error = '';
    try {
      await this.cargarDetalle(catalogoId);
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo cargar el detalle del catalogo.';
    } finally {
      this.loading = false;
    }
  }

  iniciarEdicion(item: any) {
    this.error = '';
    this.editingId = Number(item.id);
    this.editingDraft = {
      nombre: item?.nombre ?? '',
      descripcion: item?.descripcion ?? '',
      orden: item?.orden ?? null,
      activo: Boolean(item?.activo)
    };
  }

  cancelarEdicion() {
    this.editingId = null;
    this.editingDraft = {};
    this.guardando = false;
  }

  async guardarEdicion(item: any) {
    if (this.guardando || this.editingId !== Number(item.id)) {
      return;
    }

    this.guardando = true;
    this.error = '';
    try {
      await this.catalogosAdmin.actualizarRegistroCatalogoAtraccionAdmin({
        atraccion_id: Number(item.id),
        nombre: this.cleanText(this.editingDraft['nombre']),
        descripcion: this.cleanText(this.editingDraft['descripcion']),
        orden: this.parseNumber(this.editingDraft['orden']),
        activo: Boolean(this.editingDraft['activo'])
      });

      this.atracciones = this.atracciones.map((current) =>
        Number(current.id) === Number(item.id)
          ? {
              ...current,
              nombre: this.cleanText(this.editingDraft['nombre']) ?? '',
              descripcion: this.cleanText(this.editingDraft['descripcion']) ?? '',
              orden: this.parseNumber(this.editingDraft['orden']),
              activo: Boolean(this.editingDraft['activo'])
            }
          : current
      );

      this.cancelarEdicion();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo guardar el registro.';
      this.guardando = false;
    }
  }

  private async cargarDetalle(catalogoId: number) {
    const detalle = await this.catalogosAdmin.obtenerDetalleCatalogoAtraccionesAdmin(catalogoId);
    this.catalogo = detalle.catalogo;
    this.atracciones = detalle.atracciones ?? [];
  }

  private cleanText(value: string | null | undefined): string | null {
    const text = (value ?? '').trim();
    return text.length ? text : null;
  }

  private parseNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
