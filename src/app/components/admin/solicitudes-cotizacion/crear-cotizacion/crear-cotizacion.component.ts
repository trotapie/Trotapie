import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TratamientoCliente } from 'app/core/cliente-nombre.util';
import { DestinoCatalogo, DestinosService, PaisCatalogo, RegionCatalogo } from 'app/core/destinos.service';
import { SupabaseService } from 'app/core/supabase.service';
import { DateRangeFilterComponent } from 'app/shared/date-range-filter/date-range-filter.component';
import { DateRangeFilterValue, EMPTY_DATE_RANGE } from 'app/shared/date-range-filter/date-range-filter.model';
import { MaterialModule } from 'app/shared/material.module';
import { PhoneInputComponent } from 'app/shared/phone-input/phone-input.component';
import { TpInputComponent } from 'app/shared/tp-input/tp-input.component';
import { TpSelectSearchComponent, TpSelectSearchOption } from 'app/shared/tp-select-search/tp-select-search.component';
import { TpTextareaComponent } from 'app/shared/tp-textarea/tp-textarea.component';

interface IDestinoCatalogoFiltro {
  id: number;
  nombre: string;
  division_area_nombre?: string;
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
  selector: 'app-crear-cotizacion',
  standalone: true,
  imports: [
    FormsModule,
    MaterialModule,
    RouterLink,
    TpSelectSearchComponent,
    DateRangeFilterComponent,
    TpInputComponent,
    PhoneInputComponent,
    TpTextareaComponent,
  ],
  templateUrl: './crear-cotizacion.component.html',
  styleUrl: './crear-cotizacion.component.scss'
})
export class CrearCotizacionComponent implements OnInit {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private destinosService = inject(DestinosService);
  private router = inject(Router);

  tipoBusqueda: 'NACIONAL' | 'INTERNACIONAL' = 'NACIONAL';
  destinosNacionalesCatalogo: IDestinoCatalogoFiltro[] = [];
  continentes: RegionCatalogo[] = [];
  paisesInternacionalesCatalogo: PaisCatalogo[] = [];
  destinosInternacionalesCatalogo: DestinoCatalogo[] = [];
  private paisesInternacionalesConHotelesIds = new Set<number>();
  private destinosInternacionalesConHotelesIds = new Set<number>();
  asesorActual: IAsesorActual | null = null;
  hoteles: IHotelAdmin[] = [];
  regimenes: IRegimen[] = [];
  tratamientos: TratamientoCliente[] = [];

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
    hotel_id: [{ value: null as number | null, disabled: true }, [Validators.required]],
    regimen_id: [{ value: null as number | null, disabled: true }, [Validators.required]],
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
      const [destinosNacionalesCatalogo, regiones, ubicacionesConHoteles, tratamientos, asesorActual] = await Promise.all([
        this.destinosService.obtenerDestinosCatalogoPublicables('NACIONAL'),
        this.destinosService.obtenerCatalogoInternacionalRegiones(),
        this.supabase.obtenerUbicacionesCatalogoConHoteles(),
        this.supabase.obtenerTratamientosActivos(),
        this.obtenerAsesorActual(),
      ]);

      const ubicacionesNacionales = ubicacionesConHoteles.filter((item) => item.tipo === 'NACIONAL');
      const ubicacionesInternacionales = ubicacionesConHoteles.filter((item) => item.tipo === 'INTERNACIONAL');
      const destinosConHotelesIds = new Set(ubicacionesNacionales.map((item) => item.catalogoDestinoId));
      this.destinosNacionalesCatalogo = (destinosNacionalesCatalogo ?? [])
        .filter((destino: any) => destinosConHotelesIds.has(Number(destino.id))) as IDestinoCatalogoFiltro[];
      this.paisesInternacionalesConHotelesIds = new Set(
        ubicacionesInternacionales.map((item) => item.paisId).filter((id) => id > 0)
      );
      this.destinosInternacionalesConHotelesIds = new Set(
        ubicacionesInternacionales.map((item) => item.catalogoDestinoId)
      );
      this.continentes = (regiones ?? []).filter((region) =>
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

  get destinosNacionales(): IDestinoCatalogoFiltro[] {
    return this.destinosNacionalesCatalogo;
  }

  get paisesInternacionales(): PaisCatalogo[] {
    return this.paisesInternacionalesCatalogo;
  }

  get ciudadesInternacionales(): DestinoCatalogo[] {
    return this.destinosInternacionalesCatalogo;
  }

  get destinosNacionalesOpciones(): TpSelectSearchOption[] {
    return this.destinosNacionales.map((destino) => ({
      value: destino.id,
      label: destino.nombre,
      group: destino.division_area_nombre
    }));
  }

  get continentesOpciones(): TpSelectSearchOption[] {
    return this.continentes.map((continente) => ({ value: continente.id, label: continente.nombre }));
  }

  get paisesInternacionalesOpciones(): TpSelectSearchOption[] {
    return this.paisesInternacionales.map((pais) => ({ value: pais.id, label: pais.nombre }));
  }

  get ciudadesInternacionalesOpciones(): TpSelectSearchOption[] {
    return this.ciudadesInternacionales.map((ciudad) => ({ value: ciudad.id, label: ciudad.nombre }));
  }

  get hotelesOpciones(): TpSelectSearchOption[] {
    return this.hoteles.map((hotel) => ({ value: hotel.id, label: hotel.nombre_hotel }));
  }

  get regimenesOpciones(): TpSelectSearchOption[] {
    return this.regimenes.map((regimen) => ({ value: regimen.id, label: regimen.descripcion }));
  }

  get tratamientosOpciones(): TpSelectSearchOption[] {
    return this.tratamientos.map((tratamiento) => ({
      value: tratamiento.id,
      label: tratamiento.abreviacion,
    }));
  }

  get edadesOpciones(): TpSelectSearchOption[] {
    return this.ageOptions.map((edad) => ({ value: edad, label: `${edad} anos` }));
  }

  get asesorActualOpciones(): TpSelectSearchOption[] {
    return this.asesorActual ? [{ value: this.asesorActual.id, label: this.asesorActual.nombre }] : [];
  }

  get destinoSeleccionadoParaHotel(): boolean {
    return this.tipoBusqueda === 'NACIONAL'
      ? this.destinoNacionalId !== null
      : this.ciudadInternacionalId !== null;
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

  cambiarTipoBusqueda(tipo: 'NACIONAL' | 'INTERNACIONAL') {
    this.tipoBusqueda = tipo;
    this.continenteSeleccionadoId = null;
    this.paisSeleccionadoId = null;
    this.destinoNacionalId = null;
    this.ciudadInternacionalId = null;
    this.paisesInternacionalesCatalogo = [];
    this.destinosInternacionalesCatalogo = [];
    this.error = '';
    this.resetHotelSelection();
  }

  async seleccionarDestinoNacional(destinoId: number | null) {
    this.destinoNacionalId = destinoId;
    this.error = '';
    this.resetHotelSelection();
    await this.cargarHoteles(destinoId);
  }

  async seleccionarContinente(continenteId: number | null) {
    this.continenteSeleccionadoId = continenteId;
    this.paisSeleccionadoId = null;
    this.ciudadInternacionalId = null;
    this.paisesInternacionalesCatalogo = [];
    this.destinosInternacionalesCatalogo = [];
    this.error = '';
    this.resetHotelSelection();

    if (!continenteId) return;

    try {
      this.paisesInternacionalesCatalogo = (await this.destinosService
        .obtenerCatalogoInternacionalPaises([continenteId]))
        .filter((pais) => this.paisesInternacionalesConHotelesIds.has(pais.id));
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron cargar los países.';
    }
  }

  async seleccionarPais(paisId: number | null) {
    this.paisSeleccionadoId = paisId;
    this.ciudadInternacionalId = null;
    this.destinosInternacionalesCatalogo = [];
    this.error = '';
    this.resetHotelSelection();

    if (!paisId) return;

    try {
      this.destinosInternacionalesCatalogo = (await this.destinosService
        .obtenerCatalogoInternacionalDestinosPorPais(paisId))
        .filter((destino) => this.destinosInternacionalesConHotelesIds.has(destino.id));
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron cargar los destinos.';
    }
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
    this.actualizarDisponibilidadSeleccionHotel();

    if (!hotelId) return;
    await this.cargarRegimenesHotel(hotelId);
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
      tratamiento_id: this.parseTratamientoId(cliente?.tratamiento_id),
      nombre_completo: String(cliente?.nombre_completo ?? cliente?.nombre ?? '').trim(),
      correo: cliente?.email ? String(cliente.email).trim() : '',
      telefono: cliente?.telefono ? String(cliente.telefono).replace(/\D/g, '') : ''
    });
    this.cerrarModalClientes();
  }

  private async cargarHoteles(destinoId: number | null) {
    this.hoteles = [];
    this.actualizarDisponibilidadSeleccionHotel();
    if (!destinoId) return;

    this.cargandoHoteles = true;
    this.actualizarDisponibilidadSeleccionHotel();
    try {
      const hoteles = await this.supabase.obtenerHotelesAdminPorCatalogoDestino(destinoId);
      this.hoteles = (hoteles ?? []) as IHotelAdmin[];
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron cargar los hoteles del destino.';
    } finally {
      this.cargandoHoteles = false;
      this.actualizarDisponibilidadSeleccionHotel();
    }
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

  private async cargarRegimenesHotel(hotelId: number) {
    this.cargandoRegimenes = true;
    this.actualizarDisponibilidadSeleccionHotel();

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
      this.actualizarDisponibilidadSeleccionHotel();
    }
  }

  private resetHotelSelection() {
    this.hoteles = [];
    this.regimenes = [];
    this.form.patchValue({ hotel_id: null, regimen_id: null });
    this.actualizarDisponibilidadSeleccionHotel();
  }

  private actualizarDisponibilidadSeleccionHotel() {
    const hotelControl = this.form.get('hotel_id');
    const regimenControl = this.form.get('regimen_id');
    const puedeSeleccionarHotel = this.destinoSeleccionadoParaHotel && !this.cargandoHoteles && this.hoteles.length > 0;
    const puedeSeleccionarRegimen = puedeSeleccionarHotel &&
      !this.cargandoRegimenes &&
      this.regimenes.length > 0 &&
      Boolean(hotelControl?.value);

    if (puedeSeleccionarHotel) {
      hotelControl?.enable({ emitEvent: false });
    } else {
      hotelControl?.disable({ emitEvent: false });
    }

    if (puedeSeleccionarRegimen) {
      regimenControl?.enable({ emitEvent: false });
    } else {
      regimenControl?.disable({ emitEvent: false });
    }
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

    const fechaEntrada = start;
    const fechaSalida = end;

    this.guardando = true;
    try {
      const nombreCompleto = String(value.nombre_completo ?? '').trim();
      const tratamientoId = this.parseTratamientoId(value.tratamiento_id);
      const cliente = await this.supabase.upsertCliente({
        nombre: nombreCompleto,
        nombre_completo: nombreCompleto,
        tratamiento_id: tratamientoId,
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
        const childrenText = `${room.children} menor${room.children === 1 ? '' : 'es'}`;
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

  private calcularNoches(start: string | null, end: string | null) {
    if (!start || !end) {
      this.noches = 0;
      return;
    }

    const startDate = this.dateFromKey(start);
    const endDate = this.dateFromKey(end);

    const diffMs = endDate.getTime() - startDate.getTime();
    const result = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    this.noches = result > 0 ? result : 0;
  }

  private dateFromKey(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private parseTratamientoId(value: number | null | undefined): number | null {
    const tratamientoId = Number(value);
    return Number.isFinite(tratamientoId) && tratamientoId > 0 ? tratamientoId : null;
  }
}

