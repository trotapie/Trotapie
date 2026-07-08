import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FuseSplashScreenService } from '@fuse/services/splash-screen';
import {
  DestinosService,
  DestinoCatalogo,
  DivisionAreaCatalogo,
  PaisCatalogo,
  RegionCatalogo
} from 'app/core/destinos.service';
import { EmpleadosService } from 'app/core/empleados.service';
import { ClientesService } from 'app/core/clientes.service';
import { HotelesService, IHotelAdminCatalogo } from 'app/core/hoteles.service';
import { CotizacionesService } from 'app/core/cotizaciones.service';
import { TratamientoCliente } from 'app/core/cliente-nombre.util';
import { MaterialModule } from 'app/shared/material.module';
import { backdropFade, modalScaleFade } from 'app/shared/animations';
import { SupabaseService } from 'app/core/supabase.service';

type IHotelAdmin = IHotelAdminCatalogo;

interface IHotelComparativaDraft {
  hotel_id: number;
  hotel_nombre: string;
  destino_nombre: string;
  regimen_id: number | null;
  regimen: string;
  precio: number | string | null;
  precioConSeguro: number | string | null;
  precioMeses: number | string | null;
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
  nombre_completo?: string | null;
  tratamiento_id?: number | null;
  email: string | null;
  telefono: string | null;
  recibir_ofertas?: boolean | null;
}

type Room = { adults: number; children: number; childAges: (number | null)[] };

@Component({
  selector: 'app-cotizacion-multiple',
  standalone: true,
  imports: [MaterialModule, RouterLink],
  templateUrl: './cotizacion-multiple.component.html',
  styleUrl: './cotizacion-multiple.component.scss',
  animations: [modalScaleFade, backdropFade],
})
export class CotizacionMultipleComponent implements OnInit {
  private fb = inject(FormBuilder);
  private destinosService = inject(DestinosService);
  private empleadosService = inject(EmpleadosService);
  private clientesService = inject(ClientesService);
  private hotelesService = inject(HotelesService);
  private cotizacionesService = inject(CotizacionesService);
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private splashScreen = inject(FuseSplashScreenService);

  tipoBusqueda: 'NACIONAL' | 'INTERNACIONAL' = 'NACIONAL';
  regiones: RegionCatalogo[] = [];
  divisionesNacionales: DivisionAreaCatalogo[] = [];
  paisesInternacionalesTodos: PaisCatalogo[] = [];
  destinosInternacionalesTodos: DestinoCatalogo[] = [];
  asesores: IAsesor[] = [];
  hoteles: IHotelAdmin[] = [];
  regimenes: IRegimen[] = [];
  tratamientos: TratamientoCliente[] = [];
  hotelSeleccionadoId: number | null = null;
  hotelesComparativa: IHotelComparativaDraft[] = [];

  regionSeleccionadaId: number | null = null;
  paisSeleccionadoId: number | null = null;
  divisionAreaNacionalId: number | null = null;
  destinoInternacionalId: number | null = null;

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
    return `${this.totalRooms()} hab. · ${this.totalPeople()} ${personas}`;
  });

  form = this.fb.group({
    rangoFechas: this.fb.group({
      start: [null as Date | null, [Validators.required]],
      end: [null as Date | null, [Validators.required]],
    }),
    asesor_id: [null as number | null, [Validators.required]],
    tratamiento_id: [null as number | null],
    nombre_completo: ['', [Validators.required]],
    correo: ['', [Validators.email]],
    telefono: ['', [Validators.required, Validators.minLength(10)]],
    especiales: ['']
  });

  async ngOnInit() {
    this.splashScreen.show();

    try {
      this.cargando = true;
      const [divisionesNacionales, regiones, paisesInternacionales, empleadosResponse, tratamientos] = await Promise.all([
        this.destinosService.obtenerCatalogoNacionalesDivisionAreas(),
        this.destinosService.obtenerCatalogoInternacionalRegiones(),
        this.destinosService.obtenerCatalogoInternacionalPaises(),
        this.empleadosService.empleados(),
        this.supabase.obtenerTratamientosActivos()
      ]);

      this.divisionesNacionales = divisionesNacionales;
      this.regiones = regiones;
      this.paisesInternacionalesTodos = paisesInternacionales;
      this.tratamientos = tratamientos;

      if (empleadosResponse.error) {
        throw empleadosResponse.error;
      }

      this.asesores = (empleadosResponse.data ?? []).map((item: any) => ({
        id: Number(item.id),
        nombre: String(item.nombre ?? '')
      }));

      await this.cargarHoteles();

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

  get destinosNacionales(): DivisionAreaCatalogo[] {
    return this.divisionesNacionales;
  }

  get paisesInternacionales(): PaisCatalogo[] {
    if (!this.regionSeleccionadaId) return [];
    return this.paisesInternacionalesTodos.filter((pais) => pais.region_id === this.regionSeleccionadaId);
  }

  get ciudadesInternacionales(): DestinoCatalogo[] {
    if (!this.paisSeleccionadoId) return [];
    return this.destinosInternacionalesTodos.filter((destino) => destino.pais_id === this.paisSeleccionadoId);
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

  get resumenDestinoLabel(): string {
    return this.tipoBusqueda === 'NACIONAL' ? 'Estado / area' : 'Destino';
  }

  get resumenDestino(): string {
    return this.destinoActualNombre();
  }

  get resumenTipoBusqueda(): string {
    return this.tipoBusqueda === 'NACIONAL' ? 'Nacional' : 'Internacional';
  }

  get resumenHotel(): string {
    if (!this.hotelesComparativa.length) {
      return 'Sin hoteles';
    }

    if (this.hotelesComparativa.length === 1) {
      return this.hotelesComparativa[0].hotel_nombre;
    }

    return `${this.hotelesComparativa.length} hoteles seleccionados`;
  }

  get hotelSeleccionadoActual(): IHotelAdmin | null {
    const id = Number(this.hotelSeleccionadoId);
    if (!Number.isFinite(id) || id <= 0) {
      return null;
    }

    return this.hoteles.find((item) => item.id === id) ?? null;
  }

  get regimenSeleccionado(): string {
    return this.hotelSeleccionadoActual?.regimen ?? '';
  }

  get comparativaBloqueada(): boolean {
    return this.hotelesComparativa.length > 0;
  }

  get resumenRegimen(): string {
    if (!this.hotelesComparativa.length) {
      return 'Sin regimen';
    }

    const regimenes = this.hotelesComparativa
      .map((item) => item.regimen)
      .filter((item) => Boolean(String(item ?? '').trim()));

    return regimenes.length ? regimenes.join(' · ') : 'Sin regimen';
  }

  personasHabitacionesValida(): boolean {
    return this.rooms().length > 0 && !this.hasMissingAges();
  }

  rangoFechasValido(): boolean {
    return this.form.get('rangoFechas')?.valid === true;
  }

  hotelesCotizacionValida(): boolean {
    return this.destinoFinalValido() && this.hotelesComparativa.length >= 2;
  }

  datosFinalesValida(): boolean {
    return this.destinoFinalValido() &&
      this.rangoFechasValido() &&
      this.form.get('asesor_id')?.valid === true &&
      this.form.get('nombre_completo')?.valid === true &&
      this.form.get('telefono')?.valid === true;
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
    this.regionSeleccionadaId = null;
    this.paisSeleccionadoId = null;
    this.divisionAreaNacionalId = null;
    this.destinoInternacionalId = null;
    this.destinosInternacionalesTodos = [];
    this.error = '';
  }

  async seleccionarDestinoNacional(destinoId: number | null) {
    this.divisionAreaNacionalId = destinoId;
    this.error = '';
  }

  async seleccionarContinente(continenteId: number | null) {
    this.regionSeleccionadaId = continenteId;
    this.paisSeleccionadoId = null;
    this.destinoInternacionalId = null;
    this.destinosInternacionalesTodos = [];
    this.error = '';
  }

  async seleccionarPais(paisId: number | null) {
    this.paisSeleccionadoId = paisId;
    this.destinoInternacionalId = null;
    this.destinosInternacionalesTodos = paisId
      ? await this.destinosService.obtenerCatalogoInternacionalDestinosPorPais(paisId)
      : [];
    this.error = '';
  }

  async seleccionarCiudadInternacional(ciudadId: number | null) {
    this.destinoInternacionalId = ciudadId;
    this.error = '';
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
    this.clienteBusquedaNombre = String(this.form.get('nombre_completo')?.value ?? '').trim();
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
      this.resultadosClientes = await this.clientesService.buscarClientes({
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
      tratamiento_id: this.parseTratamientoId(cliente?.tratamiento_id),
      nombre_completo: String(cliente?.nombre_completo ?? cliente?.nombre ?? '').trim(),
      correo: cliente?.email ? String(cliente.email).trim() : '',
      telefono: cliente?.telefono ? String(cliente.telefono).replace(/\D/g, '') : ''
    });
    this.cerrarModalClientes();
  }

  private async cargarHoteles() {
    this.hoteles = [];

    this.cargandoHoteles = true;
    try {
      const hoteles = await this.hotelesService.obtenerHotelesAdmin();
      this.hoteles = (hoteles ?? []) as IHotelAdminCatalogo[];
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron cargar los hoteles disponibles.';
    } finally {
      this.cargandoHoteles = false;
    }
  }

  private destinoSeleccionadoId(): number | null {
    return this.tipoBusqueda === 'NACIONAL'
      ? this.divisionAreaNacionalId
      : this.destinoInternacionalId;
  }

  private destinoActualNombre(): string {
    if (this.tipoBusqueda === 'NACIONAL') {
      const destino = this.destinosNacionales.find((item) => item.id === this.divisionAreaNacionalId);
      return destino?.nombre ?? 'Destino';
    }

    const ciudad = this.ciudadesInternacionales.find((item) => item.id === this.destinoInternacionalId);
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

  get hotelesFiltrados(): IHotelAdmin[] {
    const destinoId = this.destinoSeleccionadoId();
    const idsSeleccionados = new Set(this.hotelesComparativa.map((item) => item.hotel_id));

    if (!destinoId) {
      return [];
    }

    return this.hoteles.filter((hotel) => {
      const coincideDestino = this.tipoBusqueda === 'NACIONAL'
        ? !this.divisionAreaNacionalId || hotel.division_area_id === this.divisionAreaNacionalId
        : this.destinoInternacionalId
          ? hotel.catalogo_destino_id === this.destinoInternacionalId
          : this.paisSeleccionadoId
            ? hotel.pais_id === this.paisSeleccionadoId
            : true;
      return coincideDestino && !idsSeleccionados.has(hotel.id);
    });
  }

  hotelYaEnComparativa(hotelId: number | null | undefined): boolean {
    const id = Number(hotelId);
    if (!Number.isFinite(id) || id <= 0) {
      return false;
    }

    return this.hotelesComparativa.some((item) => item.hotel_id === id);
  }

  agregarHotelAComparativa() {
    const id = Number(this.hotelSeleccionadoId);
    if (!Number.isFinite(id) || id <= 0) {
      return;
    }

    if (this.hotelYaEnComparativa(id)) {
      return;
    }

    const hotel = this.hoteles.find((item) => item.id === id);
    if (!hotel) {
      return;
    }

    if (hotel.tipo_catalogo !== this.tipoBusqueda) {
      this.error = this.tipoBusqueda === 'NACIONAL'
        ? 'Solo puedes agregar hoteles nacionales en esta comparativa.'
        : 'Solo puedes agregar hoteles internacionales en esta comparativa.';
      return;
    }

    this.hotelesComparativa = [
      ...this.hotelesComparativa,
      {
        hotel_id: hotel.id,
        hotel_nombre: hotel.nombre_hotel,
        destino_nombre: hotel.destino_nombre,
        regimen_id: hotel.regimen_id,
        regimen: hotel.regimen,
        precio: null,
        precioConSeguro: null,
        precioMeses: null
      }
    ];
    this.hotelSeleccionadoId = null;
    this.sincronizarHotelesComparativa();
  }

  eliminarHotelComparativa(hotelId: number) {
    this.hotelesComparativa = this.hotelesComparativa.filter((item) => item.hotel_id !== hotelId);
  }

  actualizarHotelComparativa(indice: number, campo: keyof IHotelComparativaDraft, valor: string | number | null) {
    this.hotelesComparativa = this.hotelesComparativa.map((item, idx) =>
      idx === indice ? { ...item, [campo]: valor } : item
    );
  }

  hotelComparativaCompleta(hotel: IHotelComparativaDraft): boolean {
    return this.parseNumber(hotel.precio) !== null
      && this.parseNumber(hotel.precioConSeguro) !== null
      && this.parseNumber(hotel.precioMeses) !== null;
  }

  get resumenHotelesComparativa(): string {
    if (!this.hotelesComparativa.length) {
      return 'Selecciona hoteles para comparar';
    }

    return this.hotelesComparativa.map((hotel) => hotel.hotel_nombre).join(' · ');
  }

  async crearCotizacion() {
    this.error = '';
    if (!this.personasHabitacionesValida()) {
      this.form.markAllAsTouched();
      this.error = 'Completa habitaciones, personas, fechas y datos de la persona solicitante.';
      return;
    }

    if (!this.hotelesCotizacionValida()) {
      this.error = 'Selecciona al menos dos hoteles.';
      return;
    }

    if (!this.destinoFinalValido()) {
      this.error = this.tipoBusqueda === 'NACIONAL'
        ? 'Completa el estado o area antes de guardar.'
        : 'Completa region, pais y destino antes de guardar.';
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
    const destinoId = this.destinoSeleccionadoId();

    this.guardando = true;
    try {
      const nombreCompleto = String(value.nombre_completo ?? '').trim();
      const tratamientoId = this.parseTratamientoId(value.tratamiento_id);
      const cliente = await this.clientesService.upsertCliente({
        nombre: nombreCompleto,
        nombre_completo: nombreCompleto,
        tratamiento_id: tratamientoId,
        email: value.correo?.trim() ? String(value.correo).trim() : null,
        telefono: String(value.telefono ?? '').trim(),
        recibir_ofertas: false
      });

      const habitaciones = this.formatHabitaciones(this.rooms());
      const peticionesEspeciales = value.especiales?.trim() ? String(value.especiales).trim() : null;
      const hotelPrincipal = this.hotelesComparativa[0];
      const regimenId = hotelPrincipal?.regimen_id ?? null;

      if (!hotelPrincipal) {
        throw new Error('Selecciona al menos un hotel para crear la cotizacion.');
      }

      const solicitud = await this.cotizacionesService.crearSolicitudCotizacion({
        cliente_id: Number(cliente.id),
        hotel_id: Number(hotelPrincipal.hotel_id),
        empleado_id: Number(value.asesor_id),
        idioma: 'es',
        regimen_id: regimenId,
        fecha_entrada: fechaEntrada,
        fecha_salida: fechaSalida,
        noches: this.noches,
        habitaciones,
        peticiones_especiales: peticionesEspeciales,
        recibir_ofertas: false
      });

      if (!solicitud?.public_id) {
        throw new Error('No se pudo obtener el public_id de la cotizacion creada.');
      }

      await this.cotizacionesService.actualizarCotizacionPublicaCompleta(solicitud.public_id, {
        precio: this.parseNumber(hotelPrincipal?.precio),
        precioConSeguro: this.parseNumber(hotelPrincipal?.precioConSeguro),
        precioMeses: this.parseNumber(hotelPrincipal?.precioMeses),
        tipoHabitacion: null,
        estatus: 'pendiente',
        condicionesPrecioSinSeguro: [],
        condicionesPrecioConSeguro: [],
        condicionesPrecioMeses: [],
        porcentajeSeguro: null,
        porcentajeMeses: null,
        fechaLimiteSeguro: null,
        fechaLimiteMeses: null,
        cotizacionMultiple: this.buildCotizacionMultiplePayload()
      });

      await this.router.navigate(['/admin/edicion-cotizacion', solicitud.public_id]);
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo crear la cotizacion.';
    } finally {
      this.guardando = false;
    }
  }

  private sincronizarHotelesComparativa() {
    this.hotelesComparativa = this.hotelesComparativa.map((hotel) => ({
      ...hotel,
      hotel_nombre: hotel.hotel_nombre || `Hotel ${hotel.hotel_id}`,
      destino_nombre: hotel.destino_nombre || '',
      regimen: hotel.regimen || 'Regimen'
    }));
  }

  destinoFinalValido(): boolean {
    return this.tipoBusqueda === 'NACIONAL'
      ? Boolean(this.divisionAreaNacionalId)
      : Boolean(this.regionSeleccionadaId && this.paisSeleccionadoId && this.destinoInternacionalId);
  }

  private buildCotizacionMultiplePayload() {
    const destinoId = this.destinoSeleccionadoId() ?? 0;
    const destinoNombre = this.destinoActualNombre();

    return this.hotelesComparativa.map((hotel, index) => ({
      hotel_id: hotel.hotel_id,
      hotel_nombre: hotel.hotel_nombre,
      regimen_id: hotel.regimen_id,
      regimen: hotel.regimen,
      destino_id: destinoId,
      destino_nombre: destinoNombre,
      precio: this.parseNumber(hotel.precio),
      precio_con_seguro: this.parseNumber(hotel.precioConSeguro),
      precio_a_meses: this.parseNumber(hotel.precioMeses),
      condiciones_precio: [],
      condiciones_precio_seguro: [],
      condiciones_precio_meses: [],
      porcentaje_seguro: null,
      porcentaje_meses: null,
      fecha_limite_seguro: null,
      fecha_limite_meses: null,
      tipo_tarifa: null,
      orden: index + 1,
      es_principal: index === 0
    }));
  }

  private parseTratamientoId(value: number | null | undefined): number | null {
    const tratamientoId = Number(value);
    return Number.isFinite(tratamientoId) && tratamientoId > 0 ? tratamientoId : null;
  }

  private parseNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  private formatHabitaciones(rooms: Room[]) {
    const formatted = rooms.map((room, index) => {
      const parts: string[] = [];
      parts.push(`${room.adults} ${room.adults === 1 ? 'adulto' : 'adultos'}`);

      if (room.children > 0) {
        const childrenText = `${room.children} ${room.children === 1 ? 'niño' : 'niños'}`;
        if (room.childAges?.length) {
          parts.push(`${childrenText} · edades: ${room.childAges.join(', ')}`);
        } else {
          parts.push(childrenText);
        }
      }

      return `Habitación ${index + 1}: ${parts.join(' · ')}`;
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

