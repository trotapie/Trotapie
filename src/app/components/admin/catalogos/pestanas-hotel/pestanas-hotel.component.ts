import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogoPestanaHotel, CatalogoPestanasHotelService } from 'app/core/catalogo-pestanas-hotel.service';
import { MaterialModule } from 'app/shared/material.module';
import { TpToastService } from 'app/shared/tp-toast/tp-toast.service';

@Component({
  selector: 'app-pestanas-hotel',
  standalone: true,
  imports: [FormsModule, MaterialModule, RouterLink],
  templateUrl: './pestanas-hotel.component.html'
})
export class PestanasHotelComponent implements OnInit {
  private readonly catalogo = inject(CatalogoPestanasHotelService);
  private readonly toast = inject(TpToastService);
  readonly iconos = [
    { valor: 'article', etiqueta: 'Documento' },
    { valor: 'schedule', etiqueta: 'Reloj' },
    { valor: 'local_offer', etiqueta: 'Etiqueta' },
    { valor: 'info', etiqueta: 'Información' },
    { valor: 'restaurant', etiqueta: 'Restaurante' },
    { valor: 'star', etiqueta: 'Estrella' }
  ];
  pestanas: CatalogoPestanaHotel[] = [];
  editando: { id?: number; titulo_es: string; icono: string; activo: boolean } | null = null;
  cargando = true;
  guardando = false;
  error = '';

  ngOnInit(): void { void this.cargar(); }

  async cargar(): Promise<void> {
    this.cargando = true;
    this.error = '';
    try {
      this.pestanas = await this.catalogo.obtener();
    } catch {
      this.error = 'No se pudo cargar el catálogo. Comprueba la conexión e intenta de nuevo.';
    } finally {
      this.cargando = false;
    }
  }

  editar(pestana?: CatalogoPestanaHotel): void {
    this.editando = pestana
      ? { id: pestana.id, titulo_es: pestana.titulo_es, icono: pestana.icono, activo: pestana.activo }
      : { titulo_es: '', icono: 'article', activo: true };
  }

  async guardar(): Promise<void> {
    if (!this.editando || this.guardando) return;
    const nombre = this.editando.titulo_es.trim().replace(/\s+/g, ' ');
    if (!nombre) return;
    if (this.pestanas.some((item) => item.id !== this.editando?.id &&
      item.titulo_es.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es') === nombre.toLocaleLowerCase('es'))) {
      this.toast.show({ title: 'Pestaña duplicada', message: 'Ya existe una pestaña con ese nombre.', variant: 'error' });
      return;
    }
    this.guardando = true;
    try {
      await this.catalogo.guardar({ ...this.editando, titulo_es: nombre });
      this.editando = null;
      await this.cargar();
      this.toast.show({ title: 'Catálogo actualizado', message: 'El nombre estará disponible en los hoteles.', variant: 'success' });
    } catch (error: any) {
      this.toast.show({ title: 'No se pudo guardar', message: error?.code === '23505'
        ? 'Ya existe una pestaña con ese nombre.' : error?.message ?? 'Intenta de nuevo.', variant: 'error' }, 6000);
    } finally {
      this.guardando = false;
    }
  }
}
