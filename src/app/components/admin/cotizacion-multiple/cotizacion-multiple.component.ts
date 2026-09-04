import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  DestinosService,
  DestinoCatalogo,
  PaisCatalogo,
  RegionCatalogo
} from 'app/core/destinos.service';
import { ClientesService } from 'app/core/clientes.service';
import { IHotelAdminCatalogo } from 'app/core/hoteles.service';
import { TratamientoCliente } from 'app/core/cliente-nombre.util';
import { MaterialModule } from 'app/shared/material.module';
import { backdropFade, modalScaleFade } from 'app/shared/animations';
import { SupabaseService } from 'app/core/supabase.service';
import { TpInputComponent } from 'app/shared/tp-input/tp-input.component';
import { PhoneInputComponent } from 'app/shared/phone-input/phone-input.component';
import { TpSelectSearchComponent, TpSelectSearchOption } from 'app/shared/tp-select-search/tp-select-search.component';
import { TpTextareaComponent } from 'app/shared/tp-textarea/tp-textarea.component';
import { DateRangeFilterComponent } from 'app/shared/date-range-filter/date-range-filter.component';
import { DateRangeFilterValue, EMPTY_DATE_RANGE } from 'app/shared/date-range-filter/date-range-filter.model';

type IHotelAdmin = IHotelAdminCatalogo;

interface IDestinoNacionalCatalogo {
  id: number;
  nombre: string;
  division_area_nombre?: string;
}

interface IHotelComparativaDraft {
  hotel_id: number;
  hotel_nombre: string;
  destino_nombre: string;
  regimen_id: number | null;
  regimen: string;
}

interface IRegimen {
  id: number;
  descripcion: string;
}

interface IAsesorActual {
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
  imports: [
    FormsModule,
    MaterialModule,
    RouterLink,
    TpInputComponent,
    PhoneInputComponent,
    TpSelectSearchComponent,
    TpTextareaComponent,
    DateRangeFilterComponent,
  ],
  templateUrl: './cotizacion-multiple.component.html',
  styleUrl: './cotizacion-multiple.component.scss',
  animations: [modalScaleFade, backdropFade],
})
export class CotizacionMultipleComponent implements OnInit {
  private fb = inject(FormBuilder);
  private destinosService = inject(DestinosService);
  private clientesService = inject(ClientesService);
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  tipoBusqueda: 'NACIONAL' | 'INTERNACIONAL' = 'NACIONAL';
  regiones: RegionCatalogo[] = [];
  destinosNacionalesCatalogo: IDestinoNacionalCatalogo[] = [];
  paisesInternacionalesTodos: PaisCatalogo[] = [];
  destinosInternacionalesTodos: DestinoCatalogo[] = [];
  paisesInternacionalesConHotelesIds = new Set<number>();
  destinosInternacionalesConHotelesIds = new Set<number>();
  asesorActual: IAsesorActual | null = null;
  hoteles: IHotelAdmin[] = [];
  regimenes: IRegimen[] = [];
  tratamientos: TratamientoCliente[] = [];
  hotelSeleccionadoId: number | null = null;
  regimenSeleccionadoId: number | null = null;
  hotelesComparativa: IHotelComparativaDraft[] = [];

  regionSeleccionadaId: number | null = null;
  paisSeleccionadoId: number | null = null;
  destinoNacionalId: number | null = null;
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
  readonly ASESOR_RESPALDO_ID = 6;
  readonly fechaMinima = new Date();

  ageOptions = Array.from({ length: 18 }, (_, i) => i);
  rooms = signal<Room[]>([{ adults: 2, children: 0, childAges: [] }]);
  totalRooms = computed(() => this.rooms().length);
  totalPeople = computed(() => this.rooms().reduce((a, r) => a + r.adults + r.children, 0));
  labelHabitaciones = computed(() => {
    const personas = this.totalPeople() === 1 ? 'persona' : 'personas';
    return `${this.totalRooms()} hab. · ${this.totalPeople()} ${personas}`;
  });

  form = this.fb.group({
    rangoFechas: this.fb.control<DateRangeFilterValue>({ ...EMPTY_DATE_RANGE }, [
      (control) => control.value?.start && control.value?.end ? null : { required: true },
    ]),
    asesor_id: [null as number | null, [Validators.required]],
    tratamiento_id: [null as number | null],
    nombre_completo: ['', [Validators.required]],
    correo: ['', [Validators.email]],
    telefono: ['', [Validators.required, Validators.minLength(10)]],
    especiales: ['']
  });

  async ngOnInit() {
    try {
      this.cargando = true;
      const [destinosNacionales, regiones, ubicacionesConHoteles, tratamientos, asesorActual] = await Promise.all([
        this.destinosService.obtenerDestinosCatalogoPublicables('NACIONAL'),
        this.destinosService.obtenerCatalogoInternacionalRegiones(),
        this.supabase.obtenerUbicacionesCatalogoConHoteles(),
        this.supabase.obtenerTratamientosActivos(),
        this.obtenerAsesorActual(),
      ]);

      const ubicacionesNacionales = ubicacionesConHoteles.filter((item) => item.tipo === 'NACIONAL');
      const ubicacionesInternacionales = ubicacionesConHoteles.filter((item) => item.tipo === 'INTERNACIONAL');
      const destinosNacionalesConHotelesIds = new Set(ubicacionesNacionales.map((item) => item.catalogoDestinoId));

      this.destinosNacionalesCatalogo = (destinosNacionales as IDestinoNacionalCatalogo[])
        .filter((destino) => destinosNacionalesConHotelesIds.has(destino.id));
      this.paisesInternacionalesConHotelesIds = new Set(
        ubicacionesInternacionales.map((item) => item.paisId).filter((id) => id > 0)
      );
      this.destinosInternacionalesConHotelesIds = new Set(
        ubicacionesInternacionales.map((item) => item.catalogoDestinoId)
      );
      this.regiones = regiones.filter((region) =>
        ubicacionesInternacionales.some((item) => item.regionId === region.id)
      );
      this.tratamientos = tratamientos;
      this.asesorActual = asesorActual;
      this.form.patchValue({ asesor_id: asesorActual.id });

      this.form.get('rangoFechas')?.valueChanges.subscribe((range) => {
        this.calcularNoches(range?.start ?? null, range?.end ?? null);
      });
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo cargar la pantalla para crear cotizacion.';
    } finally {
      this.cargando = false;
    }
  }

  get destinosNacionales(): IDestinoNacionalCatalogo[] {
    return this.destinosNacionalesCatalogo;
  }

  get paisesInternacionales(): PaisCatalogo[] {
    if (!this.regionSeleccionadaId) return [];
    return this.paisesInternacionalesTodos.filter((pais) => pais.region_id === this.regionSeleccionadaId);
  }

  get ciudadesInternacionales(): DestinoCatalogo[] {
    if (!this.paisSeleccionadoId) return [];
    return this.destinosInternacionalesTodos.filter((destino) => destino.pais_id === this.paisSeleccionadoId);
  }

  get destinosNacionalesOpciones(): TpSelectSearchOption[] {
    return this.destinosNacionales.map((destino) => ({
      value: destino.id,
      label: destino.nombre,
      group: destino.division_area_nombre,
    }));
  }

  get regionesOpciones(): TpSelectSearchOption[] {
    return this.regiones.map((region) => ({ value: region.id, label: region.nombre }));
  }

  get paisesInternacionalesOpciones(): TpSelectSearchOption[] {
    return this.paisesInternacionales.map((pais) => ({ value: pais.id, label: pais.nombre }));
  }

  get ciudadesInternacionalesOpciones(): TpSelectSearchOption[] {
    return this.ciudadesInternacionales.map((ciudad) => ({ value: ciudad.id, label: ciudad.nombre }));
  }

  get hotelesFiltradosOpciones(): TpSelectSearchOption[] {
    return this.hotelesFiltrados.map((hotel) => ({
      value: hotel.id,
      label: hotel.nombre_hotel,
      group: hotel.destino_nombre,
    }));
  }

  get tratamientosOpciones(): TpSelectSearchOption[] {
    return this.tratamientos.map((tratamiento) => ({
      value: tratamiento.id,
      label: tratamiento.abreviacion,
    }));
  }

  get edadesOpciones(): TpSelectSearchOption[] {
    return this.ageOptions.map((edad) => ({ value: edad, label: `${edad} años` }));
  }

  get regimenesOpciones(): TpSelectSearchOption[] {
    return this.regimenes.map((regimen) => ({ value: regimen.id, label: regimen.descripcion }));
  }

  get fechaSalida(): string {
    return this.form.get('rangoFechas')?.value?.end ?? '';
  }

  get fechaEntrada(): string {
    return this.form.get('rangoFechas')?.value?.start ?? '';
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
    return this.destinoFinalValido()
      && this.hotelesComparativa.length >= 2;
  }

  datosFinalesValida(): boolean {
    return this.destinoFinalValido() &&
      this.rangoFechasValido() &&
      this.form.get('asesor_id')?.valid === true &&
      this.form.get('nombre_completo')?.valid === true &&
      this.form.get('telefono')?.valid === true;
  }

  cambiarTipoBusqueda(tipo: 'NACIONAL' | 'INTERNACIONAL') {
    this.tipoBusqueda = tipo;
    this.regionSeleccionadaId = null;
    this.paisSeleccionadoId = null;
    this.destinoNacionalId = null;
    this.destinoInternacionalId = null;
    this.paisesInternacionalesTodos = [];
    this.destinosInternacionalesTodos = [];
    this.error = '';
    this.resetSeleccionHotel();
  }

  async seleccionarDestinoNacional(destinoId: number | null) {
    this.destinoNacionalId = destinoId;
    this.error = '';
    this.resetSeleccionHotel();
    await this.cargarHoteles(destinoId);
  }

  async seleccionarContinente(continenteId: number | null) {
    this.regionSeleccionadaId = continenteId;
    this.paisSeleccionadoId = null;
    this.destinoInternacionalId = null;
    this.destinosInternacionalesTodos = [];
    this.error = '';
    this.resetSeleccionHotel();

    if (!continenteId) return;

    try {
      this.paisesInternacionalesTodos = (await this.destinosService
        .obtenerCatalogoInternacionalPaises([continenteId]))
        .filter((pais) => this.paisesInternacionalesConHotelesIds.has(pais.id));
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron cargar los paises.';
    }
  }

  async seleccionarPais(paisId: number | null) {
    this.paisSeleccionadoId = paisId;
    this.destinoInternacionalId = null;
    this.error = '';
    this.resetSeleccionHotel();

    if (!paisId) return;

    try {
      this.destinosInternacionalesTodos = (await this.destinosService
        .obtenerCatalogoInternacionalDestinosPorPais(paisId))
        .filter((destino) => this.destinosInternacionalesConHotelesIds.has(destino.id));
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron cargar los destinos.';
    }
  }

  async seleccionarCiudadInternacional(ciudadId: number | null) {
    this.destinoInternacionalId = ciudadId;
    this.error = '';
    this.resetSeleccionHotel();
    await this.cargarHoteles(ciudadId);
  }

  async onHotelChange(hotelId: number | null): Promise<void> {
    this.hotelSeleccionadoId = hotelId;
    this.regimenSeleccionadoId = null;
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

  private async obtenerAsesorActual(): Promise<IAsesorActual> {
    const { data: session, error: sessionError } = await this.supabase.getClient().auth.getUser();
    if (!sessionError && session.user?.id) {
      const { data: empleado, error: empleadoError } = await this.supabase
        .getClient()
        .from('empleados')
        .select('id, nombre')
        .eq('auth_user_id', session.user.id)
        .maybeSingle();

      if (!empleadoError && empleado?.id && empleado.nombre) {
        return { id: Number(empleado.id), nombre: String(empleado.nombre) };
      }
    }

    const { data: asesorRespaldo, error: asesorRespaldoError } = await this.supabase
      .getClient()
      .from('empleados')
      .select('id, nombre')
      .eq('id', this.ASESOR_RESPALDO_ID)
      .single();

    if (asesorRespaldoError) throw asesorRespaldoError;

    return {
      id: Number(asesorRespaldo.id),
      nombre: String(asesorRespaldo.nombre),
    };
  }

  private async cargarHoteles(destinoId: number | null): Promise<void> {
    this.hoteles = [];

    if (!destinoId) return;

    this.cargandoHoteles = true;
    try {
      const hoteles = await this.supabase.obtenerHotelesAdminPorCatalogoDestino(destinoId);
      this.hoteles = (hoteles ?? []) as IHotelAdminCatalogo[];
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron cargar los hoteles disponibles.';
    } finally {
      this.cargandoHoteles = false;
    }
  }

  private destinoSeleccionadoId(): number | null {
    return this.tipoBusqueda === 'NACIONAL'
      ? this.destinoNacionalId
      : this.destinoInternacionalId;
  }

  private destinoActualNombre(): string {
    if (this.tipoBusqueda === 'NACIONAL') {
      const destino = this.destinosNacionales.find((item) => item.id === this.destinoNacionalId);
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
    const idsSeleccionados = new Set(this.hotelesComparativa.map((item) => item.hotel_id));

    return this.hoteles.filter((hotel) => !idsSeleccionados.has(hotel.id));
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

    const regimenId = Number(this.regimenSeleccionadoId);
    const regimen = this.regimenes.find((item) => item.id === regimenId);
    if (!regimen) {
      this.error = 'Selecciona un regimen para agregar el hotel.';
      return;
    }

    const hotel = this.hoteles.find((item) => item.id === id);
    if (!hotel) {
      return;
    }

    this.hotelesComparativa = [
      ...this.hotelesComparativa,
      {
        hotel_id: hotel.id,
        hotel_nombre: hotel.nombre_hotel,
        destino_nombre: hotel.destino_nombre,
        regimen_id: regimen.id,
        regimen: regimen.descripcion,
      }
    ];
    this.resetSeleccionHotel();
    this.sincronizarHotelesComparativa();
  }

  eliminarHotelComparativa(hotelId: number) {
    this.hotelesComparativa = this.hotelesComparativa.filter((item) => item.hotel_id !== hotelId);
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
        ? 'Completa el destino antes de guardar.'
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
      const cotizacion = await this.supabase.guardarCotizacionMultiple({
        cliente_id: Number(cliente.id),
        empleado_id: Number(value.asesor_id),
        nombre_persona: nombreCompleto,
        correo: value.correo?.trim() ? String(value.correo).trim() : null,
        telefono: String(value.telefono ?? '').trim(),
        destino_id: Number(destinoId),
        fecha_entrada: fechaEntrada,
        fecha_salida: fechaSalida,
        noches: this.noches,
        total_personas: this.totalPeople(),
        total_habitaciones: this.totalRooms(),
        habitaciones,
        peticiones_especiales: peticionesEspeciales,
        estatus_clave: 'pendiente',
        hoteles: this.hotelesComparativa.map((hotel, index) => ({
          hotel_id: hotel.hotel_id,
          regimen_id: hotel.regimen_id,
          hotel_nombre: hotel.hotel_nombre,
          destino_id: destinoId,
          destino_nombre: hotel.destino_nombre || this.destinoActualNombre(),
          orden: index + 1,
          es_principal: index === 0,
          precio: null,
          precio_con_seguro: null,
          precio_a_meses: null
        }))
      });

      if (!cotizacion?.public_id) {
        throw new Error('No se pudo obtener el enlace de la comparativa creada.');
      }

      await this.router.navigate(['/admin/cotizaciones/concentrado/detalle', cotizacion.public_id]);
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
      ? Boolean(this.destinoNacionalId)
      : Boolean(this.regionSeleccionadaId && this.paisSeleccionadoId && this.destinoInternacionalId);
  }

  private parseTratamientoId(value: number | null | undefined): number | null {
    const tratamientoId = Number(value);
    return Number.isFinite(tratamientoId) && tratamientoId > 0 ? tratamientoId : null;
  }

  private formatHabitaciones(rooms: Room[]) {
    const formatted = rooms.map((room, index) => {
      const parts: string[] = [];
      parts.push(`${room.adults} ${room.adults === 1 ? 'adulto' : 'adultos'}`);

      if (room.children > 0) {
        const childrenText = `${room.children} menor${room.children === 1 ? '' : 'es'}`;
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

  private calcularNoches(start: string | null, end: string | null) {
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

  private formatDate(value: string): string {
    return value;
  }

  private async cargarRegimenesHotel(hotelId: number): Promise<void> {
    this.cargandoRegimenes = true;
    try {
      const infoHotel = await this.supabase.infoHotel(hotelId, 'es');
      const regimenes = (infoHotel?.regimenes ?? []).map((item: any) => ({
        id: Number(item.id),
        descripcion: String(item.descripcion ?? ''),
      }));
      this.regimenes = regimenes.filter((regimen, index, all) =>
        regimen.id > 0 && all.findIndex((item) => item.id === regimen.id) === index,
      );

      if (!this.regimenes.length) {
        const hotel = this.hoteles.find((item) => item.id === hotelId);
        this.regimenes = hotel?.regimen_id
          ? [{ id: hotel.regimen_id, descripcion: hotel.regimen || 'Regimen' }]
          : [];
      }

      if (this.regimenes.length === 1) {
        this.regimenSeleccionadoId = this.regimenes[0].id;
      }
    } catch {
      const hotel = this.hoteles.find((item) => item.id === hotelId);
      this.regimenes = hotel?.regimen_id
        ? [{ id: hotel.regimen_id, descripcion: hotel.regimen || 'Regimen' }]
        : [];
      this.regimenSeleccionadoId = this.regimenes.length === 1 ? this.regimenes[0].id : null;
    } finally {
      this.cargandoRegimenes = false;
    }
  }

  private resetSeleccionHotel(): void {
    this.hotelSeleccionadoId = null;
    this.regimenSeleccionadoId = null;
    this.regimenes = [];
  }
}

