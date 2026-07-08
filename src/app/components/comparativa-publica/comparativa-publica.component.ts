import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SupabaseService } from 'app/core/supabase.service';
import { MaterialModule } from 'app/shared/material.module';

@Component({
  selector: 'app-comparativa-publica',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './comparativa-publica.component.html',
  styleUrl: './comparativa-publica.component.scss'
})
export class ComparativaPublicaComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly supabase = inject(SupabaseService);

  cotizacion: any | null = null;
  hoteles: any[] = [];
  cargando = true;
  error = '';

  readonly imagenesRespaldo = [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=1400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=1400&auto=format&fit=crop'
  ];

  async ngOnInit(): Promise<void> {
    const publicId = this.route.snapshot.paramMap.get('id') ?? '';

    try {
      this.cargando = true;
      const data = await this.supabase.obtenerDetalleCotizacionMultiple(publicId);

      if (!data) {
        this.error = 'No se encontro la comparativa.';
        return;
      }

      this.cotizacion = data;
      this.hoteles = data.cotizacion ?? [];
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo cargar la comparativa.';
    } finally {
      this.cargando = false;
    }
  }

  get clienteNombre(): string {
    return String(this.cotizacion?.cliente_nombre ?? this.cotizacion?.nombre_persona ?? '').trim() || 'Cliente';
  }

  get destinosResumen(): string {
    const destinos = new Set(
      this.hoteles
        .map((hotel) => String(hotel?.destino_nombre ?? '').trim())
        .filter(Boolean)
    );

    return Array.from(destinos).join(', ') || 'Destinos seleccionados';
  }

  get heroImage(): string {
    return this.obtenerImagenHotel(this.hoteles[0], 0);
  }

  get textoViajeros(): string {
    const total = Number(this.cotizacion?.total_personas);
    if (Number.isFinite(total) && total > 0) {
      return `${total} viajero${total === 1 ? '' : 's'}`;
    }

    return 'Viajeros por confirmar';
  }

  get textoHabitaciones(): string {
    const total = Number(this.cotizacion?.total_habitaciones);
    if (Number.isFinite(total) && total > 0) {
      return `${total} habitacion${total === 1 ? '' : 'es'}`;
    }

    return 'Habitaciones por confirmar';
  }

  obtenerImagenHotel(row: any, index: number): string {
    const imagen = String(row?.imagen_url ?? row?.fondo ?? '').trim();
    if (imagen) return imagen;

    const imagenes = Array.isArray(row?.imagenes) ? row.imagenes : [];
    const primeraImagen = imagenes
      .map((item: any) => String(item?.url_imagen ?? '').trim())
      .find(Boolean);

    return primeraImagen || this.imagenesRespaldo[index % this.imagenesRespaldo.length];
  }

  obtenerEstrellas(row: any): number {
    const estrellas = Number(row?.estrellas);
    if (!Number.isFinite(estrellas) || estrellas <= 0) return 5;
    return Math.min(5, Math.max(1, Math.round(estrellas)));
  }

  obtenerEstrellasArray(row: any): number[] {
    return Array.from({ length: this.obtenerEstrellas(row) }, (_, index) => index);
  }

  obtenerRegimenHotel(row: any): string {
    return String(row?.regimen ?? '').trim() || 'Regimen por confirmar';
  }

  obtenerPrecio(row: any): string {
    const precio = Number(row?.precio);
    if (!Number.isFinite(precio) || precio <= 0) return 'Por confirmar';

    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0
    }).format(precio);
  }

  obtenerFechasResumen(): string {
    if (!this.cotizacion?.fecha_entrada || !this.cotizacion?.fecha_salida) return 'Fechas por confirmar';

    const formato = new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    return `${formato.format(new Date(this.cotizacion.fecha_entrada))} - ${formato.format(new Date(this.cotizacion.fecha_salida))}`;
  }

  imprimir(): void {
    window.print();
  }

  contactarAgente(): void {
    const publicId = String(this.cotizacion?.public_id ?? this.route.snapshot.paramMap.get('id') ?? '').trim();
    const url = `${window.location.origin}/share/comparativa/${publicId}`;
    const mensaje = encodeURIComponent(`Hola, quiero informacion sobre mi comparativa de hoteles: ${url}`);
    window.open(`https://wa.me/?text=${mensaje}`, '_blank', 'noopener');
  }
}
