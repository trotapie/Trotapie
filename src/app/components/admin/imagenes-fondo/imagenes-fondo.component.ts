import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from 'app/shared/material.module';
import { SupabaseService } from 'app/core/supabase.service';
import { TraduccionesService } from 'app/core/traducciones.service';
import { EstatusComponent } from 'app/shared/estatus/estatus.component';
import { TpToastService } from 'app/shared/tp-toast/tp-toast.service';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { TpActionMenuItem, TpActionsMenuComponent } from 'app/shared/tp-actions-menu/tp-actions-menu.component';
import { BlockingLoaderComponent } from 'app/shared/blocking-loader/blocking-loader.component';

interface Idioma {
  id: number;
  codigo: string;
  nombre: string;
}

interface ImagenFondo {
  id: number;
  url_imagen: string;
  nombre_destino: string;
  activo: boolean;
  traducciones: Record<string, string>;
}

interface ImagenFondoForm {
  id: number | null;
  url_imagen: string;
  activo: boolean;
  traducciones: Record<string, string>;
}

@Component({
  selector: 'app-imagenes-fondo',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, EstatusComponent, TpActionsMenuComponent, BlockingLoaderComponent],
  templateUrl: './imagenes-fondo.component.html',
  styleUrl: './imagenes-fondo.component.scss'
})
export class ImagenesFondoComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly traduccionesService = inject(TraduccionesService);
  private readonly toast = inject(TpToastService);
  private readonly confirmationService = inject(FuseConfirmationService);

  imagenes: ImagenFondo[] = [];
  idiomas: Idioma[] = [];
  cargando = true;
  guardando = false;
  cambiandoEstadoId: number | null = null;
  modoSeleccion = false;
  idsSeleccionados = new Set<number>();
  procesandoSeleccion = false;
  error = '';
  modalAbierto = false;
  form: ImagenFondoForm = this.nuevoFormulario();

  async ngOnInit(): Promise<void> {
    await this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    this.cargando = true;
    this.error = '';
    try {
      const [idiomas, imagenes] = await Promise.all([
        this.supabase.obtenerIdiomasAdmin(),
        this.supabase.obtenerImagenesFondoAdmin()
      ]);

      this.idiomas = idiomas.map((idioma: any) => ({
        id: Number(idioma.id),
        codigo: String(idioma.codigo).toLowerCase(),
        nombre: idioma.nombre ?? idioma.codigo
      }));
      this.imagenes = imagenes.map((imagen: any) => this.normalizarImagen(imagen));
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron cargar las imágenes de fondo.';
    } finally {
      this.cargando = false;
    }
  }

  abrirNueva(): void {
    this.form = this.nuevoFormulario();
    this.modalAbierto = true;
  }

  editar(imagen: ImagenFondo): void {
    this.form = {
      id: imagen.id,
      url_imagen: imagen.url_imagen,
      activo: imagen.activo,
      traducciones: { ...imagen.traducciones }
    };
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    if (!this.guardando) this.modalAbierto = false;
  }

  async guardar(): Promise<void> {
    const textoEspanol = this.form.traducciones.es?.trim();
    if (!this.form.url_imagen.trim() || !textoEspanol) {
      this.mostrarToast('Datos incompletos', 'La URL de imagen y el texto en español son obligatorios.', 'error');
      return;
    }

    this.guardando = true;
    try {
      const resultado = await this.traducirNombreEspanol(textoEspanol);

      this.idiomas.forEach((idioma) => {
        if (idioma.codigo === 'es') return;
        const traduccion = resultado?.[idioma.codigo]?.title;
        if (typeof traduccion === 'string' && traduccion.trim()) {
          this.form.traducciones[idioma.codigo] = traduccion.trim();
        }
      });

      await this.supabase.guardarImagenFondoAdmin({
        id: this.form.id,
        url_imagen: this.form.url_imagen.trim(),
        activo: this.form.activo,
        nombre_destino: textoEspanol,
        traducciones: this.idiomas.map((idioma) => ({
          idioma_id: idioma.id,
          nombre_destino: this.form.traducciones[idioma.codigo] ?? ''
        }))
      });
      this.mostrarToast('Cambios guardados', this.form.id ? 'Imagen actualizada correctamente.' : 'Imagen agregada correctamente.', 'success');
      this.modalAbierto = false;
      await this.cargarDatos();
    } catch (error: any) {
      this.mostrarToast('No se pudo guardar', error?.message ?? 'No se pudo guardar la imagen de fondo.', 'error');
    } finally {
      this.guardando = false;
    }
  }

  eliminar(imagen: ImagenFondo): void {
    this.confirmationService.open({
      title: 'Eliminar imagen',
      message: '¿Estás seguro de eliminar esta imagen? Esta acción no se puede deshacer.',
      icon: { show: true, name: 'heroicons_outline:trash', color: 'warn' },
      actions: {
        confirm: { show: true, label: 'Eliminar imagen', color: 'warn' },
        cancel: { show: true, label: 'Cancelar' }
      },
      dismissible: true
    }).afterClosed().subscribe((resultado) => {
      if (resultado === 'confirmed') void this.confirmarEliminacion(imagen);
    });
  }

  alternarModoSeleccion(): void {
    this.modoSeleccion = !this.modoSeleccion;
    if (!this.modoSeleccion) this.limpiarSeleccion();
  }

  alternarSeleccion(imagen: ImagenFondo): void {
    if (this.idsSeleccionados.has(imagen.id)) {
      this.idsSeleccionados.delete(imagen.id);
      return;
    }
    this.idsSeleccionados.add(imagen.id);
  }

  alternarSeleccionTodas(): void {
    if (this.todasSeleccionadas) {
      this.limpiarSeleccion();
      return;
    }
    this.imagenes.forEach((imagen) => this.idsSeleccionados.add(imagen.id));
  }

  limpiarSeleccion(): void {
    this.idsSeleccionados.clear();
  }

  estaSeleccionada(imagen: ImagenFondo): boolean {
    return this.idsSeleccionados.has(imagen.id);
  }

  cambiarEstadoSeleccionadas(activo: boolean): void {
    const ids = this.idsSeleccionadosArray;
    if (!ids.length || this.procesandoSeleccion) return;

    void this.confirmarCambioEstadoSeleccionadas(ids, activo);
  }

  eliminarSeleccionadas(): void {
    const ids = this.idsSeleccionadosArray;
    if (!ids.length || this.procesandoSeleccion) return;

    this.confirmationService.open({
      title: 'Eliminar imágenes seleccionadas',
      message: `¿Estás seguro de eliminar ${ids.length} ${ids.length === 1 ? 'imagen' : 'imágenes'}? Esta acción no se puede deshacer.`,
      icon: { show: true, name: 'heroicons_outline:trash', color: 'warn' },
      actions: {
        confirm: { show: true, label: `Eliminar ${ids.length} ${ids.length === 1 ? 'imagen' : 'imágenes'}`, color: 'warn' },
        cancel: { show: true, label: 'Cancelar' }
      },
      dismissible: true
    }).afterClosed().subscribe((resultado) => {
      if (resultado === 'confirmed') void this.confirmarEliminacionSeleccionadas(ids);
    });
  }

  private async confirmarEliminacion(imagen: ImagenFondo): Promise<void> {
    try {
      await this.supabase.eliminarImagenFondoAdmin(imagen.id);
      this.mostrarToast('Imagen eliminada', 'La imagen se eliminó correctamente.', 'success');
      await this.cargarDatos();
    } catch (error: any) {
      this.mostrarToast('No se pudo eliminar', error?.message ?? 'No se pudo eliminar la imagen de fondo.', 'error');
    }
  }

  async alternarEstado(imagen: ImagenFondo): Promise<void> {
    if (this.cambiandoEstadoId) return;

    this.cambiandoEstadoId = imagen.id;
    try {
      await this.supabase.actualizarEstadoImagenFondoAdmin(imagen.id, !imagen.activo);
      imagen.activo = !imagen.activo;
      this.mostrarToast('Estado actualizado', imagen.activo ? 'La imagen ahora aparece en el carrusel.' : 'La imagen ya no aparece en el carrusel.', 'success');
    } catch (error: any) {
      this.mostrarToast('No se pudo actualizar el estado', error?.message ?? 'Intenta nuevamente.', 'error');
    } finally {
      this.cambiandoEstadoId = null;
    }
  }

  get cantidadSeleccionada(): number {
    return this.idsSeleccionados.size;
  }

  get todasSeleccionadas(): boolean {
    return this.imagenes.length > 0 && this.idsSeleccionados.size === this.imagenes.length;
  }

  get idsSeleccionadosArray(): number[] {
    return Array.from(this.idsSeleccionados);
  }

  accionesImagen(imagen: ImagenFondo): TpActionMenuItem[] {
    return [
      {
        id: 'estado',
        label: imagen.activo ? 'Desactivar' : 'Activar',
        icon: imagen.activo ? 'heroicons_outline:eye-slash' : 'heroicons_outline:eye',
        disabled: this.cambiandoEstadoId === imagen.id
      },
      { id: 'editar', label: 'Editar', icon: 'heroicons_outline:pencil-square' },
      { id: 'eliminar', label: 'Eliminar imagen', icon: 'heroicons_outline:trash', danger: true }
    ];
  }

  ejecutarAccionImagen(actionId: string, imagen: ImagenFondo): void {
    if (actionId === 'estado') void this.alternarEstado(imagen);
    if (actionId === 'editar') this.editar(imagen);
    if (actionId === 'eliminar') this.eliminar(imagen);
  }

  faltanTraducciones(imagen: ImagenFondo): boolean {
    return this.idiomas.some((idioma) => !imagen.traducciones[idioma.codigo]?.trim());
  }

  get puedeGuardar(): boolean {
    return Boolean(this.form.url_imagen.trim() && this.form.traducciones.es?.trim());
  }

  private async confirmarCambioEstadoSeleccionadas(ids: number[], activo: boolean): Promise<void> {
    this.procesandoSeleccion = true;
    try {
      await this.supabase.actualizarEstadoImagenesFondoAdmin(ids, activo);
      this.imagenes.forEach((imagen) => {
        if (ids.includes(imagen.id)) imagen.activo = activo;
      });
      this.limpiarSeleccion();
      this.modoSeleccion = false;
      this.mostrarToast('Estado actualizado', `${ids.length} ${ids.length === 1 ? 'imagen fue' : 'imágenes fueron'} ${activo ? 'activada' : 'inactivada'}${ids.length === 1 ? '' : 's'} correctamente.`, 'success');
    } catch (error: any) {
      this.mostrarToast('No se pudo actualizar el estado', error?.message ?? 'Intenta nuevamente.', 'error');
    } finally {
      this.procesandoSeleccion = false;
    }
  }

  private async traducirNombreEspanol(nombre: string): Promise<any> {
    let ultimoError: unknown;

    for (let intento = 0; intento < 3; intento++) {
      try {
        return await this.traduccionesService.traducirDesdeEspanol({ title: nombre, description: '' });
      } catch (error) {
        ultimoError = error;
        if (intento < 2) await new Promise((resolve) => setTimeout(resolve, 700 * (intento + 1)));
      }
    }

    throw ultimoError;
  }

  private async confirmarEliminacionSeleccionadas(ids: number[]): Promise<void> {
    this.procesandoSeleccion = true;
    try {
      await this.supabase.eliminarImagenesFondoAdmin(ids);
      this.imagenes = this.imagenes.filter((imagen) => !ids.includes(imagen.id));
      this.limpiarSeleccion();
      this.modoSeleccion = false;
      this.mostrarToast('Imágenes eliminadas', `${ids.length} ${ids.length === 1 ? 'imagen fue eliminada' : 'imágenes fueron eliminadas'} correctamente.`, 'success');
    } catch (error: any) {
      this.mostrarToast('No se pudieron eliminar las imágenes', error?.message ?? 'Intenta nuevamente.', 'error');
    } finally {
      this.procesandoSeleccion = false;
    }
  }

  private nuevoFormulario(): ImagenFondoForm {
    return {
      id: null,
      url_imagen: '',
      activo: true,
      traducciones: { es: '', en: '', pt: '', fr: '', de: '' }
    };
  }

  private normalizarImagen(imagen: any): ImagenFondo {
    const traducciones = this.nuevoFormulario().traducciones;
    (imagen.traducciones ?? []).forEach((traduccion: any) => {
      const codigo = String(traduccion.idioma?.codigo ?? '').toLowerCase();
      if (codigo) traducciones[codigo] = traduccion.nombre_destino ?? '';
    });
    traducciones.es ||= imagen.nombre_destino ?? '';

    return {
      id: Number(imagen.id),
      url_imagen: imagen.url_imagen ?? '',
      nombre_destino: traducciones.es,
      activo: Boolean(imagen.activo),
      traducciones
    };
  }

  private mostrarToast(title: string, message: string, variant: 'success' | 'error'): void {
    this.toast.show({ title, message, variant });
  }
}
