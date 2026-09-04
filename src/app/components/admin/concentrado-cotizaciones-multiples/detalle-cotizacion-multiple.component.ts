import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SupabaseService } from 'app/core/supabase.service';
import { MaterialModule } from 'app/shared/material.module';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-detalle-cotizacion-multiple',
  standalone: true,
  imports: [MaterialModule, RouterLink, FormsModule],
  templateUrl: './detalle-cotizacion-multiple.component.html',
  styleUrl: './detalle-cotizacion-multiple.component.scss'
})
export class DetalleCotizacionMultipleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly supabase = inject(SupabaseService);
  private readonly snackBar = inject(MatSnackBar);

  cotizacion: any | null = null;
  hoteles: any[] = [];
  hotelesDisponibles: any[] = [];
  destinoSeleccionadoId: number | null = null;
  hotelSeleccionadoId: number | null = null;
  cargando = true;
  guardandoHotel = false;
  enviandoCorreo = false;
  selectorHotelAbierto = false;
  confirmarAgregarOtroHotel = false;
  modalQuitarAbierto = false;
  hotelParaQuitar: any | null = null;
  quitandoHotelId: number | null = null;
  error = '';

  readonly imagenesRespaldo = [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=1200&auto=format&fit=crop'
  ];

  async ngOnInit() {
    await this.cargarDetalle();
  }

  async cargarDetalle() {
    const publicId = this.route.snapshot.paramMap.get('id') ?? '';

    try {
      this.cargando = true;
      const data = await this.supabase.obtenerDetalleCotizacionMultiple(publicId);

      if (!data) {
        this.error = 'No se encontro la cotizacion multiple.';
        return;
      }

      this.cotizacion = data;
      this.hoteles = data.cotizacion ?? [];
      await this.cargarHotelesDisponibles();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo cargar el detalle de la cotizacion multiple.';
    } finally {
      this.cargando = false;
    }
  }

  abrirSelectorHotel(): void {
    this.error = '';
    this.destinoSeleccionadoId = null;
    this.hotelSeleccionadoId = null;
    this.confirmarAgregarOtroHotel = false;
    this.selectorHotelAbierto = true;
  }

  cerrarSelectorHotel(): void {
    if (this.guardandoHotel) return;
    this.selectorHotelAbierto = false;
    this.destinoSeleccionadoId = null;
    this.hotelSeleccionadoId = null;
    this.confirmarAgregarOtroHotel = false;
  }

  onDestinoAgregarChange(destinoId: number | null): void {
    this.destinoSeleccionadoId = destinoId;
    this.hotelSeleccionadoId = null;
  }

  get tipoComparativaLabel(): string {
    const tipo = String(this.cotizacion?.tipo_destino ?? '').trim().toUpperCase();
    return tipo === 'INTERNACIONAL' ? 'Internacional' : 'Nacional';
  }

  get destinosParaAgregar(): Array<{ id: number; nombre: string }> {
    const destinos = new Map<number, string>();

    for (const hotel of this.hotelesDisponiblesMismoTipo()) {
      const destinoId = Number(hotel?.destino_id);
      const destinoNombre = String(hotel?.destino_nombre ?? '').trim();

      if (Number.isFinite(destinoId) && destinoId > 0 && destinoNombre && this.hotelDisponibleParaAgregar(hotel)) {
        destinos.set(destinoId, destinoNombre);
      }
    }

    return Array.from(destinos.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
  }

  get hotelesParaAgregar(): any[] {
    const destinoId = Number(this.destinoSeleccionadoId);
    if (!Number.isFinite(destinoId) || destinoId <= 0) return [];

    return this.hotelesDisponiblesMismoTipo()
      .filter((hotel) => Number(hotel.destino_id) === destinoId && this.hotelDisponibleParaAgregar(hotel))
      .sort((a, b) => String(a.nombre_hotel ?? '').localeCompare(String(b.nombre_hotel ?? ''), 'es', { sensitivity: 'base' }));
  }

  get hotelSeleccionado(): any | null {
    const id = Number(this.hotelSeleccionadoId);
    if (!Number.isFinite(id) || id <= 0) return null;
    return this.hotelesParaAgregar.find((hotel) => Number(hotel.id) === id) ?? null;
  }

  async agregarHotelComparativa(): Promise<void> {
    const hotel = this.hotelSeleccionado;
    if (!this.cotizacion || !hotel) return;

    this.guardandoHotel = true;
    this.error = '';

    try {
      const ordenes = this.hoteles.map((item) => Number(item?.orden)).filter(Number.isFinite);
      const siguienteOrden = (ordenes.length ? Math.max(...ordenes) : 0) + 1;

      await this.supabase.agregarHotelACotizacionMultiple({
        cotizacion_multiple_id: Number(this.cotizacion.id),
        cliente_id: Number(this.cotizacion.cliente_id),
        empleado_id: Number(this.cotizacion.empleado_id),
        fecha_entrada: this.cotizacion.fecha_entrada,
        fecha_salida: this.cotizacion.fecha_salida,
        noches: Number(this.cotizacion.noches ?? 0),
        habitaciones: this.cotizacion.habitaciones ?? null,
        peticiones_especiales: this.cotizacion.peticiones_especiales ?? null,
        hotel: {
          id: Number(hotel.id),
          nombre_hotel: String(hotel.nombre_hotel ?? ''),
          destino_id: Number(hotel.destino_id),
          destino_nombre: String(hotel.destino_nombre ?? ''),
          regimen_id: hotel.regimen_id ?? null
        },
        orden: siguienteOrden
      });

      this.destinoSeleccionadoId = null;
      this.hotelSeleccionadoId = null;
      await this.cargarDetalle();
      this.confirmarAgregarOtroHotel = true;
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo agregar el hotel a la comparativa.';
    } finally {
      this.guardandoHotel = false;
    }
  }

  agregarOtroHotel(): void {
    this.confirmarAgregarOtroHotel = false;
    this.destinoSeleccionadoId = null;
    this.hotelSeleccionadoId = null;
  }

  terminarAgregarHoteles(): void {
    this.cerrarSelectorHotel();
  }

  solicitarQuitarHotel(hotel: any): void {
    this.hotelParaQuitar = hotel;
    this.modalQuitarAbierto = true;
  }

  cancelarQuitarHotel(): void {
    if (this.quitandoHotelId != null) return;
    this.modalQuitarAbierto = false;
    this.hotelParaQuitar = null;
  }

  async ejecutarQuitarHotel(): Promise<void> {
    const hotel = this.hotelParaQuitar;
    if (!hotel || !this.cotizacion) return;

    this.quitandoHotelId = Number(hotel.id);
    try {
      await this.supabase.quitarHotelDeCotizacionMultiple(this.cotizacion.id, hotel.id);
      this.snackBar.open(`"${hotel.hotel_nombre || 'Hotel'}" retirado de la comparativa.`, 'Cerrar', { duration: 3000 });
      this.modalQuitarAbierto = false;
      this.hotelParaQuitar = null;
      await this.cargarDetalle();
    } catch (error: any) {
      this.snackBar.open(error?.message ?? 'No se pudo retirar el hotel.', 'Cerrar', { duration: 4000 });
    } finally {
      this.quitandoHotelId = null;
    }
  }

  async copiarPublicId(): Promise<void> {
    const id = String(this.cotizacion?.public_id ?? this.route.snapshot.paramMap.get('id') ?? '').trim();
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      this.snackBar.open('ID copiado al portapapeles.', 'Cerrar', { duration: 2500 });
    } catch {
      this.snackBar.open('No se pudo copiar el ID.', 'Cerrar', { duration: 2500 });
    }
  }

  async copiarEnlaceComparativa(): Promise<void> {
    const publicId = String(this.cotizacion?.public_id ?? this.route.snapshot.paramMap.get('id') ?? '').trim();
    if (!publicId) return;
    const url = `${window.location.origin}/share/comparativa/${publicId}`;
    try {
      await navigator.clipboard.writeText(url);
      this.snackBar.open('Enlace de comparativa copiado al portapapeles.', 'Cerrar', { duration: 2500 });
    } catch {
      this.snackBar.open('No se pudo copiar el enlace.', 'Cerrar', { duration: 2500 });
    }
  }

  abrirVistaPreviaPublica(): void {
    const publicId = String(this.cotizacion?.public_id ?? this.route.snapshot.paramMap.get('id') ?? '').trim();
    if (!publicId) return;
    window.open(`/share/comparativa/${publicId}`, '_blank');
  }

  abrirPropuestaIndividual(hotel: any): void {
    const publicId = String(hotel?.public_id ?? '').trim();
    if (!publicId) return;
    window.open(`/cotizacion/${publicId}`, '_blank');
  }

  async compartirComparativa(): Promise<void> {
    const publicId = String(this.cotizacion?.public_id ?? this.route.snapshot.paramMap.get('id') ?? '').trim();
    if (!publicId) return;

    const url = `${window.location.origin}/share/comparativa/${publicId}`;
    const title = 'Comparativa de cotizacion Trotapie';

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }

      await navigator.clipboard.writeText(url);
      this.snackBar.open('Enlace de comparativa copiado.', 'Cerrar', { duration: 3000 });
    } catch {
      this.snackBar.open('No se pudo compartir la comparativa.', 'Cerrar', { duration: 3000 });
    }
  }

  async enviarComparativaPorCorreo(): Promise<void> {
    if (this.enviandoCorreo) return;

    const publicId = String(this.cotizacion?.public_id ?? this.route.snapshot.paramMap.get('id') ?? '').trim();
    const correo = String(this.cotizacion?.cliente_email ?? this.cotizacion?.correo ?? '').trim();
    if (!publicId || !correo) {
      this.snackBar.open('La comparativa necesita un correo de cliente para enviarse.', 'Cerrar', { duration: 4000 });
      return;
    }

    this.enviandoCorreo = true;
    try {
      await this.supabase.enviarCorreoCotizacion({
        to_email: correo,
        to_name: this.cotizacion?.cliente_nombre ?? this.cotizacion?.nombre_persona ?? '',
        asunto: 'Tu comparativa de hoteles esta lista',
        mensaje: 'Te compartimos las alternativas seleccionadas para tu viaje.',
        fecha_entrada: this.cotizacion?.fecha_entrada ?? null,
        fecha_salida: this.cotizacion?.fecha_salida ?? null,
        noches: this.cotizacion?.noches ?? null,
        public_id: publicId,
        tipo: 'comparativa'
      });
      this.snackBar.open('Comparativa enviada por correo exitosamente.', 'Cerrar', { duration: 3000 });
    } catch (error: any) {
      this.snackBar.open(error?.message ?? 'No se pudo enviar la comparativa.', 'Cerrar', { duration: 4000 });
    } finally {
      this.enviandoCorreo = false;
    }
  }

  get resumenHabitaciones(): string {
    const habitaciones = this.cotizacion?.habitaciones;

    if (typeof habitaciones === 'string') {
      return habitaciones.trim() || 'Sin detalle';
    }

    if (habitaciones && typeof habitaciones === 'object') {
      return String(habitaciones.es ?? habitaciones.traduccion ?? '').trim() || 'Sin detalle';
    }

    return 'Sin detalle';
  }

  get estatusVisual(): string {
    return this.obtenerEtiquetaEstatus(this.cotizacion?.estatus_clave);
  }

  get fechaCreacionFormateada(): string {
    if (!this.cotizacion?.created_at) return '';
    try {
      return new Intl.DateTimeFormat('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(new Date(this.cotizacion.created_at));
    } catch {
      return '';
    }
  }

  get totalPersonasVisual(): string {
    const personas = Number(this.cotizacion?.total_personas ?? 0);
    if (personas > 0) {
      return `${personas} viajero${personas === 1 ? '' : 's'}`;
    }
    return 'Sin especificar';
  }

  obtenerHabitacionesCantidad(): string {
    const texto = this.resumenHabitaciones;
    const total = this.cotizacion?.total_habitaciones;

    if (Number.isFinite(Number(total)) && Number(total) > 0) {
      return `${Number(total)} habitacion${Number(total) === 1 ? '' : 'es'}`;
    }

    return texto;
  }

  obtenerRegimenHotel(row: any): string {
    return String(row?.regimen ?? '').trim() || 'Sin regimen';
  }

  obtenerEstatusFila(row: any): string {
    return this.obtenerEtiquetaEstatus(row?.estatus_clave ?? this.cotizacion?.estatus_clave);
  }

  obtenerPrecio(row: any): string {
    const precio = Number(row?.precio);
    if (!Number.isFinite(precio) || precio <= 0) return 'Sin precio';

    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0
    }).format(precio);
  }

  obtenerPrecioConSeguro(row: any): string | null {
    const p = Number(row?.precio_con_seguro);
    if (!Number.isFinite(p) || p <= 0) return null;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0
    }).format(p);
  }

  obtenerPrecioAMeses(row: any): string | null {
    const p = Number(row?.precio_a_meses);
    if (!Number.isFinite(p) || p <= 0) return null;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0
    }).format(p);
  }

  obtenerTotalImagenes(row: any): number {
    const imagenes = Array.isArray(row?.imagenes) ? row.imagenes : [];
    return imagenes.length;
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

  obtenerInicialHotel(row: any): string {
    const nombre = String(row?.hotel_nombre ?? '').trim();
    return nombre ? nombre.charAt(0).toUpperCase() : 'H';
  }

  obtenerFechasResumen(): string {
    if (!this.cotizacion?.fecha_entrada || !this.cotizacion?.fecha_salida) return 'Sin fechas';

    try {
      const formato = new Intl.DateTimeFormat('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      return `${formato.format(new Date(this.cotizacion.fecha_entrada))} - ${formato.format(new Date(this.cotizacion.fecha_salida))}`;
    } catch {
      return `${this.cotizacion.fecha_entrada} - ${this.cotizacion.fecha_salida}`;
    }
  }

  private async cargarHotelesDisponibles(): Promise<void> {
    const hoteles = await this.supabase.obtenerHotelesAdmin();
    this.hotelesDisponibles = hoteles ?? [];
  }

  private hotelesDisponiblesMismoTipo(): any[] {
    const tipoActual = this.tipoComparativaLabel.toUpperCase();
    const esInternacional = tipoActual === 'INTERNACIONAL';

    return this.hotelesDisponibles.filter((hotel) => {
      const tipoHotel = Number(hotel?.tipo_desino_id);
      return esInternacional ? tipoHotel === 2 : tipoHotel !== 2;
    });
  }

  private hotelDisponibleParaAgregar(hotel: any): boolean {
    const idsActuales = new Set(this.hoteles.map((item) => Number(item?.hotel_id)).filter(Number.isFinite));
    return !idsActuales.has(Number(hotel?.id));
  }

  private obtenerEtiquetaEstatus(estatus?: string | null): string {
    const raw = String(estatus ?? '').trim();
    if (!raw) return 'Pendiente';

    const normalized = raw.toLowerCase();

    switch (normalized) {
      case 'pendiente':
        return 'Pendiente';
      case 'confirmada':
        return 'Confirmada';
      case 'cancelada':
        return 'Cancelado';
      case 'cotizado':
        return 'Cotizado';
      case 'cerrado':
        return 'Cerrado';
      case 'en proceso':
        return 'EN PROCESO';
      default:
        return raw;
    }
  }

  regresar(): void {
    window.history.back();
  }
}
