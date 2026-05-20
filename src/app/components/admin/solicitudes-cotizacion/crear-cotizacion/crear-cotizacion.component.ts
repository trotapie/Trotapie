import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FuseSplashScreenService } from '@fuse/services/splash-screen';
import { SupabaseService } from 'app/core/supabase.service';
import { MaterialModule } from 'app/shared/material.module';

interface IDestinoFiltro {
  id: number;
  nombre: string;
  tipo_desino_id: number;
  destino_padre_id: number | null;
  continente_id?: number | null;
}

interface IContinente {
  id: number;
  nombre: string;
}

interface IHotelAdmin {
  id: number;
  nombre_hotel: string;
  regimen: string;
  regimen_id: number | null;
  destino_id: number;
}

interface IRegimen {
  id: number;
  descripcion: string;
}

interface IAsesor {
  id: number;
  nombre: string;
}

type Room = { adults: number; children: number; childAges: (number | null)[] };

@Component({
  selector: 'app-crear-cotizacion',
  standalone: true,
  imports: [MaterialModule, RouterLink],
  templateUrl: './crear-cotizacion.component.html',
  styleUrl: './crear-cotizacion.component.scss'
})
export class CrearCotizacionComponent implements OnInit {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private splashScreen = inject(FuseSplashScreenService);

  tipoBusqueda: 'NACIONAL' | 'INTERNACIONAL' = 'NACIONAL';
  destinos: IDestinoFiltro[] = [];
  continentes: IContinente[] = [];
  asesores: IAsesor[] = [];
  hoteles: IHotelAdmin[] = [];
  regimenes: IRegimen[] = [];

  continenteSeleccionadoId: number | null = null;
  paisSeleccionadoId: number | null = null;
  destinoNacionalId: number | null = null;
  ciudadInternacionalId: number | null = null;

  cargando = true;
  cargandoHoteles = false;
  cargandoRegimenes = false;
  guardando = false;
  error = '';
  noches = 0;

  readonly MAX_ROOMS = 3;
  readonly MAX_PER_ROOM = 6;
  readonly MIN_ADULTS = 1;

  ageOptions = Array.from({ length: 18 }, (_, i) => i);
  rooms = signal<Room[]>([{ adults: 2, children: 0, childAges: [] }]);
  totalRooms = computed(() => this.rooms().length);
  totalPeople = computed(() => this.rooms().reduce((a, r) => a + r.adults + r.children, 0));
  labelHabitaciones = computed(() => {
    const personas = this.totalPeople() === 1 ? 'persona' : 'personas';
    return `${this.totalRooms()} hab. · ${this.totalPeople()} ${personas}`;
  });

  form = this.fb.group({
    hotel_id: [null as number | null, [Validators.required]],
    regimen_id: [null as number | null, [Validators.required]],
    rangoFechas: this.fb.group({
      start: [null as Date | null, [Validators.required]],
      end: [null as Date | null, [Validators.required]],
    }),
    asesor_id: [null as number | null, [Validators.required]],
    nombre: ['', [Validators.required]],
    correo: ['', [Validators.email]],
    telefono: ['', [Validators.required, Validators.minLength(10)]],
    ofertas: [false],
    especiales: ['']
  });

  async ngOnInit() {
    this.splashScreen.show();

    try {
      this.cargando = true;
      const [destinos, continentesResponse, empleadosResponse] = await Promise.all([
        this.supabase.obtenerDestinosAdmin(),
        this.supabase.continentes(),
        this.supabase.empleados()
      ]);

      this.destinos = (destinos ?? []) as IDestinoFiltro[];
      this.continentes = (continentesResponse?.data ?? []) as IContinente[];

      if (empleadosResponse.error) {
        throw empleadosResponse.error;
      }

      this.asesores = (empleadosResponse.data ?? []).map((item: any) => ({
        id: Number(item.id),
        nombre: String(item.nombre ?? '')
      }));

      this.form.get('rangoFechas')?.valueChanges.subscribe((range: any) => {
        this.calcularNoches(range?.start ?? null, range?.end ?? null);
      });
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo cargar la pantalla para crear cotizacion.';
    } finally {
      this.cargando = false;
      this.splashScreen.hide();
    }
  }

  get destinosNacionales(): IDestinoFiltro[] {
    return this.destinos.filter(
      (d) => d.destino_padre_id === null && Number(d.tipo_desino_id) !== 2
    );
  }

  get paisesInternacionales(): IDestinoFiltro[] {
    return this.destinos.filter(
      (d) =>
        Number(d.tipo_desino_id) === 2 &&
        d.destino_padre_id === null &&
        (this.continenteSeleccionadoId ? Number(d.continente_id) === this.continenteSeleccionadoId : true)
    );
  }

  get ciudadesInternacionales(): IDestinoFiltro[] {
    if (!this.paisSeleccionadoId) return [];
    return this.destinos.filter(
      (d) =>
        Number(d.tipo_desino_id) === 2 &&
        Number(d.destino_padre_id) === this.paisSeleccionadoId
    );
  }

  get fechaSalida(): string {
    const end = this.form.get('rangoFechas.end')?.value as Date | null;
    return end ? this.formatDate(end) : '';
  }

  dateFilter = (date: Date | null): boolean => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d >= today;
  };

  cambiarTipoBusqueda(tipo: 'NACIONAL' | 'INTERNACIONAL') {
    this.tipoBusqueda = tipo;
    this.continenteSeleccionadoId = null;
    this.paisSeleccionadoId = null;
    this.destinoNacionalId = null;
    this.ciudadInternacionalId = null;
    this.error = '';
    this.resetHotelSelection();
  }

  async seleccionarDestinoNacional(destinoId: number | null) {
    this.destinoNacionalId = destinoId;
    this.error = '';
    this.resetHotelSelection();
    await this.cargarHoteles(destinoId);
  }

  seleccionarContinente(continenteId: number | null) {
    this.continenteSeleccionadoId = continenteId;
    this.paisSeleccionadoId = null;
    this.ciudadInternacionalId = null;
    this.error = '';
    this.resetHotelSelection();
  }

  seleccionarPais(paisId: number | null) {
    this.paisSeleccionadoId = paisId;
    this.ciudadInternacionalId = null;
    this.error = '';
    this.resetHotelSelection();
  }

  async seleccionarCiudadInternacional(ciudadId: number | null) {
    this.ciudadInternacionalId = ciudadId;
    this.error = '';
    this.resetHotelSelection();
    await this.cargarHoteles(ciudadId);
  }

  async onHotelChange(hotelId: number | null) {
    this.form.patchValue({ hotel_id: hotelId, regimen_id: null });
    this.regimenes = [];

    if (!hotelId) return;
    await this.cargarRegimenesHotel(hotelId);
  }

  onTelefonoInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const limpio = (input.value ?? '').replace(/\D/g, '');
    this.form.get('telefono')?.setValue(limpio, { emitEvent: false });
  }

  private async cargarHoteles(destinoId: number | null) {
    this.hoteles = [];
    if (!destinoId) return;

    this.cargandoHoteles = true;
    try {
      const hoteles = await this.supabase.obtenerHotelesAdminPorDestino(destinoId);
      this.hoteles = (hoteles ?? []) as IHotelAdmin[];
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron cargar los hoteles del destino.';
    } finally {
      this.cargandoHoteles = false;
    }
  }

  private async cargarRegimenesHotel(hotelId: number) {
    this.cargandoRegimenes = true;

    try {
      const infoHotel = await this.supabase.infoHotel(hotelId, 'es');
      const regimenesHotel = (infoHotel?.regimenes ?? []).map((item: any) => ({
        id: Number(item.id),
        descripcion: String(item.descripcion ?? '')
      }));

      const regimenesUnicos = regimenesHotel.filter(
        (regimen: IRegimen, index: number, array: IRegimen[]) =>
          array.findIndex((item) => item.id === regimen.id) === index
      );

      if (regimenesUnicos.length > 0) {
        this.regimenes = regimenesUnicos;
      } else {
        const hotelSeleccionado = this.hoteles.find((item) => item.id === hotelId);
        this.regimenes = hotelSeleccionado?.regimen_id
          ? [{ id: hotelSeleccionado.regimen_id, descripcion: hotelSeleccionado.regimen || 'Regimen' }]
          : [];
      }

      if (this.regimenes.length === 1) {
        this.form.patchValue({ regimen_id: this.regimenes[0].id });
      }
    } catch {
      const hotelSeleccionado = this.hoteles.find((item) => item.id === hotelId);
      this.regimenes = hotelSeleccionado?.regimen_id
        ? [{ id: hotelSeleccionado.regimen_id, descripcion: hotelSeleccionado.regimen || 'Regimen' }]
        : [];
    } finally {
      this.cargandoRegimenes = false;
    }
  }

  private resetHotelSelection() {
    this.hoteles = [];
    this.regimenes = [];
    this.form.patchValue({ hotel_id: null, regimen_id: null });
  }

  private clampRoom(room: Room) {
    const total = room.adults + room.children;
    if (total > this.MAX_PER_ROOM) {
      const overflow = total - this.MAX_PER_ROOM;
      room.children = Math.max(0, room.children - overflow);
      room.childAges = room.childAges.slice(0, room.children);
    }

    room.adults = Math.max(this.MIN_ADULTS, room.adults);
  }

  addRoom() {
    if (this.rooms().length >= this.MAX_ROOMS) return;
    this.rooms.set([...this.rooms(), { adults: 2, children: 0, childAges: [] }]);
  }

  removeRoom(index: number) {
    if (this.rooms().length <= 1) return;
    const copy = [...this.rooms()];
    copy.splice(index, 1);
    this.rooms.set(copy);
  }

  incAdults(index: number) {
    const copy = [...this.rooms()];
    const room = { ...copy[index] };
    if (room.adults + room.children < this.MAX_PER_ROOM) {
      room.adults++;
      this.clampRoom(room);
      copy[index] = room;
      this.rooms.set(copy);
    }
  }

  decAdults(index: number) {
    const copy = [...this.rooms()];
    const room = { ...copy[index] };
    if (room.adults > this.MIN_ADULTS) {
      room.adults--;
      this.clampRoom(room);
      copy[index] = room;
      this.rooms.set(copy);
    }
  }

  incChildren(index: number) {
    const copy = [...this.rooms()];
    const room = { ...copy[index] };
    if (room.adults + room.children < this.MAX_PER_ROOM) {
      room.children++;
      room.childAges = [...room.childAges, null];
      this.clampRoom(room);
      copy[index] = room;
      this.rooms.set(copy);
    }
  }

  decChildren(index: number) {
    const copy = [...this.rooms()];
    const room = { ...copy[index] };
    if (room.children > 0) {
      room.children--;
      room.childAges = room.childAges.slice(0, room.children);
      this.clampRoom(room);
      copy[index] = room;
      this.rooms.set(copy);
    }
  }

  setChildAge(roomIndex: number, childIndex: number, age: number | null) {
    const copy = [...this.rooms()];
    const room = { ...copy[roomIndex], childAges: [...copy[roomIndex].childAges] };
    room.childAges[childIndex] = age;
    copy[roomIndex] = room;
    this.rooms.set(copy);
  }

  roomNeedsAges(room: Room) {
    return room.children > 0 && room.childAges.some((age) => age === null);
  }

  hasMissingAges() {
    return this.rooms().some((room) => this.roomNeedsAges(room));
  }

  async crearCotizacion() {
    this.error = '';
    if (this.form.invalid || this.hasMissingAges()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const start = value.rangoFechas?.start ?? null;
    const end = value.rangoFechas?.end ?? null;

    if (!start || !end || this.noches <= 0) {
      this.error = 'Selecciona un rango de fechas valido.';
      return;
    }

    const fechaEntrada = this.formatDate(start);
    const fechaSalida = this.formatDate(end);

    this.guardando = true;
    try {
      const cliente = await this.supabase.upsertCliente({
        nombre: String(value.nombre ?? '').trim(),
        email: value.correo?.trim() ? String(value.correo).trim() : null,
        telefono: String(value.telefono ?? '').trim(),
        recibir_ofertas: Boolean(value.ofertas)
      });

      const habitaciones = this.formatHabitaciones(this.rooms());

      const solicitud = await this.supabase.crearSolicitudCotizacion({
        cliente_id: Number(cliente.id),
        hotel_id: Number(value.hotel_id),
        empleado_id: Number(value.asesor_id),
        idioma: 'es',
        regimen_id: value.regimen_id ? Number(value.regimen_id) : null,
        fecha_entrada: fechaEntrada,
        fecha_salida: fechaSalida,
        noches: this.noches,
        habitaciones,
        peticiones_especiales: value.especiales?.trim() ? String(value.especiales).trim() : null,
        recibir_ofertas: Boolean(value.ofertas),
      });

      if (!solicitud?.public_id) {
        throw new Error('No se pudo obtener el public_id de la cotizacion creada.');
      }

      await this.router.navigate(['/admin/edicion-cotizacion', solicitud.public_id]);
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo crear la cotizacion.';
    } finally {
      this.guardando = false;
    }
  }

  private formatHabitaciones(rooms: Room[]) {
    const formatted = rooms.map((room, index) => {
      const parts: string[] = [];
      parts.push(`${room.adults} ${room.adults === 1 ? 'adulto' : 'adultos'}`);

      if (room.children > 0) {
        const childrenText = `${room.children} ${room.children === 1 ? 'nino' : 'ninos'}`;
        if (room.childAges?.length) {
          parts.push(`${childrenText} · edades: ${room.childAges.join(', ')}`);
        } else {
          parts.push(childrenText);
        }
      }

      return `Habitacion ${index + 1}: ${parts.join(' · ')}`;
    });

    return {
      traduccion: formatted.join('\n'),
      es: formatted.join('\n')
    };
  }

  private calcularNoches(start: Date | null, end: Date | null) {
    if (!start || !end) {
      this.noches = 0;
      return;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const diffMs = endDate.getTime() - startDate.getTime();
    const result = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    this.noches = result > 0 ? result : 0;
  }

  private formatDate(value: Date): string {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
