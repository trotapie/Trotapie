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

interface IClienteBusqueda {
  id: number;
  nombre: string;
  email: string | null;
  telefono: string | null;
  recibir_ofertas?: boolean | null;
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
  isLinear = true;
  modalClientesAbierto = false;
  buscandoClientes = false;
  clienteBusquedaNombre = '';
  clienteBusquedaEmail = '';
  clienteBusquedaTelefono = '';
  resultadosClientes: IClienteBusqueda[] = [];
  errorBusquedaClientes = '';
  clienteSeleccionadoBusqueda: IClienteBusqueda | null = null;

  readonly MAX_ROOMS = 10;
  readonly MAX_PER_ROOM = 6;
  readonly MIN_ADULTS = 1;

  ageOptions = Array.from({ length: 18 }, (_, i) => i);
  rooms = signal<Room[]>([{ adults: 2, children: 0, childAges: [] }]);
  totalRooms = computed(() => this.rooms().length);
  totalPeople = computed(() => this.rooms().reduce((a, r) => a + r.adults + r.children, 0));
  labelHabitaciones = computed(() => {
    const personas = this.totalPeople() === 1 ? 'persona' : 'personas';
    return `${this.totalRooms()} hab. � ${this.totalPeople()} ${personas}`;
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

  get fechaEntrada(): string {
    const start = this.form.get('rangoFechas.start')?.value as Date | null;
    return start ? this.formatDate(start) : '';
  }

  get resumenFechasPersonas(): string {
    const entrada = this.fechaEntrada || 'Sin entrada';
    const salida = this.fechaSalida || 'Sin salida';
    const noches = this.noches === 1 ? '1 noche' : `${this.noches} noches`;
    return `Entrada: ${entrada} | Salida: ${salida} | ${noches} | ${this.labelHabitaciones()}`;
  }

  get resumenHabitaciones(): string[] {
    return this.rooms().map((room, index) => {
      const adultos = `${room.adults} adulto${room.adults === 1 ? '' : 's'}`;
      const menores = room.children
        ? `${room.children} menor${room.children === 1 ? '' : 'es'}`
        : 'sin menores';
      const edades = room.childAges
        .filter((age): age is number => age !== null)
        .join(', ');
      const detalleEdades = room.children ? ` | edades: ${edades || 'pendientes'}` : '';

      return `Habitacion ${index + 1}: ${adultos}, ${menores}${detalleEdades}`;
    });
  }

  destinoHotelValido(): boolean {
    const destinoValido = this.tipoBusqueda === 'NACIONAL'
      ? Boolean(this.destinoNacionalId)
      : Boolean(this.continenteSeleccionadoId && this.paisSeleccionadoId && this.ciudadInternacionalId);

    return (
      destinoValido &&
      this.form.get('hotel_id')?.valid === true &&
      this.form.get('regimen_id')?.valid === true
    );
  }

  fechasPersonasValido(): boolean {
    return this.form.get('rangoFechas')?.valid === true && !this.hasMissingAges() && this.noches > 0;
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

  abrirModalClientes() {
    this.modalClientesAbierto = true;
    this.errorBusquedaClientes = '';
    this.resultadosClientes = [];
    this.clienteSeleccionadoBusqueda = null;
    this.clienteBusquedaNombre = String(this.form.get('nombre')?.value ?? '').trim();
    this.clienteBusquedaEmail = String(this.form.get('correo')?.value ?? '').trim();
    this.clienteBusquedaTelefono = String(this.form.get('telefono')?.value ?? '').trim();
  }

  cerrarModalClientes() {
    this.modalClientesAbierto = false;
    this.buscandoClientes = false;
    this.errorBusquedaClientes = '';
    this.clienteSeleccionadoBusqueda = null;
  }

  async buscarClientesExistentes() {
    this.errorBusquedaClientes = '';
    const nombre = this.clienteBusquedaNombre.trim();
    const email = this.clienteBusquedaEmail.trim();
    const telefono = this.clienteBusquedaTelefono.replace(/\D/g, '');

    if (!nombre && !email && !telefono) {
      this.errorBusquedaClientes = 'Ingresa al menos un dato para buscar clientes.';
      this.resultadosClientes = [];
      this.clienteSeleccionadoBusqueda = null;
      return;
    }

    this.buscandoClientes = true;
    this.clienteSeleccionadoBusqueda = null;
    try {
      this.resultadosClientes = await this.supabase.buscarClientes({
        nombre,
        email,
        telefono
      }) as IClienteBusqueda[];
    } catch (error: any) {
      this.errorBusquedaClientes = error?.message ?? 'No se pudieron buscar clientes.';
      this.resultadosClientes = [];
    } finally {
      this.buscandoClientes = false;
    }
  }

  seleccionarClienteBusqueda(cliente: IClienteBusqueda) {
    this.clienteSeleccionadoBusqueda = cliente;
  }

  cargarClienteSeleccionado() {
    const cliente = this.clienteSeleccionadoBusqueda;
    if (!cliente) return;

    this.form.patchValue({
      nombre: String(cliente?.nombre ?? '').trim(),
      correo: cliente?.email ? String(cliente.email).trim() : '',
      telefono: cliente?.telefono ? String(cliente.telefono).replace(/\D/g, '') : ''
    });
    this.cerrarModalClientes();
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

  private destinoActualNombre(): string {
    if (this.tipoBusqueda === 'NACIONAL') {
      const destino = this.destinosNacionales.find((item) => item.id === this.destinoNacionalId);
      return destino?.nombre ?? 'Destino';
    }

    const ciudad = this.ciudadesInternacionales.find((item) => item.id === this.ciudadInternacionalId);
    if (ciudad?.nombre) return ciudad.nombre;

    const pais = this.paisesInternacionales.find((item) => item.id === this.paisSeleccionadoId);
    return pais?.nombre ?? 'Destino';
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
    if (!this.destinoHotelValido()) {
      this.form.get('hotel_id')?.markAsTouched();
      this.form.get('regimen_id')?.markAsTouched();
      this.error = this.tipoBusqueda === 'NACIONAL'
        ? 'Selecciona destino nacional, hotel y regimen.'
        : 'Selecciona continente, destino, ciudad, hotel y regimen.';
      return;
    }
    if (!this.fechasPersonasValido()) {
      this.form.get('rangoFechas')?.markAllAsTouched();
      this.error = 'Selecciona fechas validas y edad para todos los menores.';
      return;
    }
    if (this.form.invalid || this.hasMissingAges()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const hotelId = Number(value.hotel_id ?? 0);
    if (!Number.isFinite(hotelId) || hotelId <= 0) {
      this.error = 'Selecciona un hotel para crear la cotizacion.';
      return;
    }

    const regimenIdRaw = value.regimen_id;
    const regimenId = regimenIdRaw === null || regimenIdRaw === undefined ? null : Number(regimenIdRaw);
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
        recibir_ofertas: false
      });

      const habitaciones = this.formatHabitaciones(this.rooms());
      const peticionesEspeciales = value.especiales?.trim() ? String(value.especiales).trim() : null;

      const solicitud = await this.supabase.crearSolicitudCotizacion({
        cliente_id: Number(cliente.id),
        hotel_id: hotelId,
        empleado_id: Number(value.asesor_id),
        idioma: 'es',
        regimen_id: Number.isFinite(regimenId) ? regimenId : null,
        fecha_entrada: fechaEntrada,
        fecha_salida: fechaSalida,
        noches: this.noches,
        habitaciones,
        peticiones_especiales: peticionesEspeciales,
        recibir_ofertas: false,
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
        const childrenText = `${room.children} ${room.children === 1 ? 'ni�o' : 'ni�os'}`;
        if (room.childAges?.length) {
          parts.push(`${childrenText} � edades: ${room.childAges.join(', ')}`);
        } else {
          parts.push(childrenText);
        }
      }

      return `Habitaci�n ${index + 1}: ${parts.join(' � ')}`;
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

