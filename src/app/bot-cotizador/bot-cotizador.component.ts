import { Component, computed, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { IAsesores, IDetalleHotel } from 'app/components/hoteles/hoteles.interface';
import { SupabaseService } from 'app/core/supabase.service';
import { MaterialModule } from 'app/shared/material.module';
import { firstValueFrom } from 'rxjs';
type Room = { adults: number; children: number; childAges: (number | null)[] };



@Component({
  selector: 'bot-cotizador',
  imports: [MaterialModule, TranslocoModule],
  templateUrl: './bot-cotizador.component.html',
  styleUrl: './bot-cotizador.component.scss'
})
export class BotCotizadorComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private _translocoService = inject(TranslocoService);


  modalAbierto = false;
  mostrarBot = false;
  form: boolean = false;
  noches: number = 0;
  opcionesRegimen: any[]
  hoy: string;
  error = '';
  otroId: number;
  asesores: IAsesores[] = [];

  readonly MAX_ROOMS = 3;
  readonly MAX_PER_ROOM = 6;
  readonly MIN_ADULTS = 1;

  rooms = signal<Room[]>([{ adults: 2, children: 0, childAges: [] }]);
  private plural = (palabra: string, n: number) => (n === 1 ? palabra : `${palabra}s`);

  ageOptions = Array.from({ length: 18 }, (_, i) => i); // 0..17 años

  totalRooms = computed(() => this.rooms().length);
  totalPeople = computed(() => this.rooms().reduce((a, r) => a + r.adults + r.children, 0));
  label = computed(() => `${this.totalRooms()} hab · ${this.totalPeople()} ${this.totalPeople() === 1 ? 'persona' : 'personas'}`);
  reservacionForm: FormGroup;
  get edadesNinos() {
    return this.reservacionForm.get('edadesNinos') as FormArray;
  }

  dateFilter = (date: Date | null): boolean => {
    if (!date) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const d = new Date(date);
    d.setHours(0, 0, 0, 0);


    return d >= today;
  }
  @Input() hotel: IDetalleHotel;
  @Output() cerrar = new EventEmitter<Boolean>();


  ngOnInit(): void {
    this.obtenerEmpleados();
    this.formulario();
  }

  formulario() {
    this.opcionesRegimen = this.hotel.regimenes
    const hoyDate = new Date();
    this.hoy = hoyDate.toISOString().split('T')[0];
    // this.modalAbierto = true;
    this.reservacionForm = this.formBuilder.group({
      regimen: ['', [Validators.required]],
      nombre: ['', [Validators.required]],
      correo: ['', [Validators.email]],
      rangoFechas: this.formBuilder.group({
        start: [null],
        end: [null],
      }),
      ofertas: [false],
      telefono: ['', [Validators.required, Validators.minLength(10)]],
      asesor: ['', Validators.required],
      especiales: ['']
    });

    this.reservacionForm.get('rangoFechas')!.valueChanges.subscribe(range => {
      this.calcularNoches(range?.start, range?.end);
    });

    if (this.opcionesRegimen?.length === 1) {
      this.reservacionForm.get('regimen')?.patchValue(
        this.opcionesRegimen[0]
      );
    }
  }

  async obtenerEmpleados() {
    const { data, error } = await this.supabase.empleados();
    if (error) { this.error = error.message; return; }
    this.otroId = data.find(e => e.nombre === 'Otro')?.id;
    this.asesores = data.map(e => ({
      ...e,
      nombre:
        e.nombre === 'Otro'
          ? this._translocoService.translate('empleado_otro')
          : e.nombre
    }));
  }

  calcularNoches(start: Date | null, end: Date | null): void {
    if (start && end) {
      const startDate = start;
      const endDate = end;

      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      const diffMs = endDate.getTime() - startDate.getTime();
      this.noches = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (this.noches > 0) {
        this.reservacionForm.get('noches')?.setValue(this.noches);
      } else {
        this.reservacionForm.get('noches')?.setValue('');
      }
    } else {
      this.reservacionForm.get('noches')?.setValue('');
    }
  }

  private clampRoom(r: Room) {

    const total = r.adults + r.children;
    if (total > this.MAX_PER_ROOM) {
      const exceso = total - this.MAX_PER_ROOM;
      r.children = Math.max(0, r.children - exceso);
      r.childAges = r.childAges.slice(0, r.children);
    }
    r.adults = Math.max(this.MIN_ADULTS, r.adults);
  }

  incAdults(i: number) {
    const list = [...this.rooms()];
    const r = { ...list[i] };
    if (r.adults + r.children < this.MAX_PER_ROOM) {
      r.adults++;
      this.clampRoom(r);
      list[i] = r; this.rooms.set(list);
    }
  }
  decAdults(i: number) {
    const list = [...this.rooms()];
    const r = { ...list[i] };
    if (r.adults > this.MIN_ADULTS) {
      r.adults--;
      this.clampRoom(r);
      list[i] = r; this.rooms.set(list);
    }
  }

  incChildren(i: number) {
    const list = [...this.rooms()];
    const r = { ...list[i] };
    if (r.adults + r.children < this.MAX_PER_ROOM) {
      r.children++;
      r.childAges = [...r.childAges, null]; // agrega edad pendiente
      this.clampRoom(r);
      list[i] = r; this.rooms.set(list);
    }
  }
  decChildren(i: number) {
    const list = [...this.rooms()];
    const r = { ...list[i] };
    if (r.children > 0) {
      r.children--;
      r.childAges = r.childAges.slice(0, r.children); // quita última edad
      this.clampRoom(r);
      list[i] = r; this.rooms.set(list);
    }
  }

  addRoom() {
    if (this.rooms().length >= this.MAX_ROOMS) return;
    this.rooms.set([...this.rooms(), { adults: 2, children: 0, childAges: [] }]);
  }
  removeRoom(i: number) {
    if (this.rooms().length <= 1) return;
    const list = [...this.rooms()];
    list.splice(i, 1);
    this.rooms.set(list);
  }

  roomNeedsAges(r: Room) {
    return r.children > 0 && r.childAges.some(a => a === null);
  }

  hasMissingAges() {
    return this.rooms().some(r => this.roomNeedsAges(r));
  }

  setChildAge(i: number, j: number, age: number | null) {
    const list = [...this.rooms()];
    const r = { ...list[i], childAges: [...list[i].childAges] };
    r.childAges[j] = age;
    list[i] = r;
    this.rooms.set(list);
  }

  cerrarModal() {
    this.modalAbierto = false;
    this.mostrarBot = false;
    this.form = false;
    this.cerrar.emit(true)
  }

  abrirForm() {
    this.form = true;
  }

  async abrirWhatsApp() {

    const ciudad = sessionStorage.getItem('ciudad') ?? '';

    const {
      regimen, rangoFechas, nombre, correo, telefono, asesor, especiales
    } = this.reservacionForm.getRawValue();

    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

    const fechaInicio = new Date(rangoFechas.start);
    const fechaFormateadaInicio = `${String(fechaInicio.getDate()).padStart(2, '0')}/${meses[fechaInicio.getMonth()]}/${fechaInicio.getFullYear()}`;

    const fechaFin = new Date(rangoFechas.end);
    const fechaFormateadaFin = `${String(fechaFin.getDate()).padStart(2, '0')}/${meses[fechaFin.getMonth()]}/${fechaFin.getFullYear()}`;

    const rooms = this.rooms();
    const detalleHabitaciones = this.formatHabitaciones(rooms);
    const totalRooms = rooms.length;

    const mensaje = await this.buildCotizacionMensaje({
      nombre,
      hotel: this.hotel.nombre_hotel,
      ciudad: this.hotel.destino.nombre,
      noches: this.noches,
      regimen,
      entrada: fechaFormateadaInicio,
      salida: fechaFormateadaFin,
      habitaciones: totalRooms,
      detalleHabitaciones,
      especiales,
      telefono,
      correo,
      asesor: asesor.nombre,
    });

    const telefonoTrotapie = '526188032003';
    const url = `https://wa.me/${telefonoTrotapie}?text=${encodeURIComponent(mensaje)}`;

    window.open(url, '_blank');

    this.guardarCliente({
      nombre,
      hotel: this.hotel.nombre_hotel,
      ciudad,
      noches: this.noches,
      regimen,
      entrada: fechaInicio,
      salida: fechaFin,
      habitaciones: totalRooms,
      detalleHabitaciones,
      especiales,
      telefono,
      correo,
      asesor: asesor.id,
    });

  }

  private formatHabitaciones(rooms: Room[]): { traduccion: string; es: string } {
    const datos = {
      traduccion: rooms.map((r, i) => {
        const partes: string[] = [];

        partes.push(
          `${r.adults} ${this.trPlural('adulto', 'adultos', r.adults)}`
        );

        if (r.children > 0) {
          const ninosTxt = `${r.children} ${this.trPlural('nino', 'ninos', r.children)}`;

          if (r.childAges?.length) {
            const edades = r.childAges.join(', ');
            const suf = this.trPlural('ano', 'anos', r.childAges.length);
            partes.push(
              `${ninosTxt} · ${this.trPlural('edad', 'edades', r.childAges.length)}: ${edades} ${suf}`
            );
          } else {
            partes.push(ninosTxt);
          }
        }

        return `${this._translocoService.translate('habitacion')} ${i + 1}: ${partes.join(' · ')}`;
      }).join('\n'),
      es: rooms.map((r, i) => {
        const partes: string[] = [];
        partes.push(`${r.adults} ${this.plural('adulto', r.adults)}`);

        if (r.children > 0) {
          const ninos = `${r.children} ${this.plural('niño', r.children)}`;
          if (r.childAges?.length) {
            const edades = r.childAges.join(', ');
            const suf = r.childAges.length === 1 ? 'año' : 'años';
            partes.push(`${ninos} · edades: ${edades} ${suf}`);
          } else {
            partes.push(ninos);
          }
        }

        return `Habitación ${i + 1}: ${partes.join(' · ')}`;
      }).join('\n')
    }
    return datos;
  }

  private trPlural(singularKey: string, pluralKey: string, count: number): string {
    return this._translocoService.translate(count === 1 ? singularKey : pluralKey);
  }

  actualizarEdadesNinos(cantidad: number) {
    while (this.edadesNinos.length !== 0) {
      this.edadesNinos.removeAt(0);
    }

    for (let i = 0; i < cantidad; i++) {
      this.edadesNinos.push(this.formBuilder.control('', [Validators.required, Validators.min(0), Validators.max(17)]));
    }
  }

  async guardarCliente(mensaje) {
    const { telefono, ofertas, nombre, correo } = this.reservacionForm.getRawValue();

    try {
      const nuevoCliente = {
        nombre: nombre,
        email: correo,
        telefono: telefono,
        recibir_ofertas: ofertas
      };

      const data = await this.supabase.upsertCliente(nuevoCliente);

      const payload = {
        cliente_id: data.id,
        hotel_id: this.hotel.id,
        empleado_id: mensaje.asesor,
        idioma: this._translocoService.getActiveLang(),
        regimen_id: mensaje.regimen?.id ?? null,
        fecha_entrada: mensaje.entrada,
        fecha_salida: mensaje.salida,
        noches: this.noches,
        habitaciones: mensaje.detalleHabitaciones,
        peticiones_especiales: mensaje.especiales?.trim() ? mensaje.especiales.trim() : null,
        recibir_ofertas: mensaje.recibirOfertas,
      };

      const solicitud = await this.supabase.crearSolicitudCotizacion(payload);

    } catch (err) {
      console.error('Error guardando cliente:', err);
    }
  }

  private async buildCotizacionMensaje(params: Record<string, any>) {
    const active = this._translocoService.getActiveLang(); // idioma actual

    await firstValueFrom(this._translocoService.load(active));

    if (active !== 'es') {
      await firstValueFrom(this._translocoService.load('es'));
    }

    const msgActive = this._translocoService.translate('cotizacion-mensaje', params, active);

    if (active === 'es') return msgActive;

    const msgEs = this._translocoService.translate('cotizacion-mensaje', params, 'es');

    return [
      msgActive,
      '',
      '────────────',
      '',
      msgEs,
    ].join('\n');
  }
}
