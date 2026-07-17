import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { EmpleadosService } from 'app/core/empleados.service';
import { EstatusComponent } from 'app/shared/estatus/estatus.component';
import { MaterialModule } from 'app/shared/material.module';
import { EmpleadoToastComponent } from './empleado-toast.component';
import { backdropFade, modalScaleFade, fadeSlideIn } from 'app/shared/animations';
import { BannerComponent } from 'app/shared/banner/banner.component';

interface IEmpleadoAdmin {
  id: number;
  nombre: string;
  cargo_id: number | null;
  cargo: string | null;
  telefono: string | null;
  estatus_id: number | null;
  email: string | null;
  auth_user_id: string | null;
  primera_vez_login: boolean;
}

interface ICargoEmpresa {
  id: number;
  rol: string;
  descripcion_rol: string;
  estatus: boolean;
}

interface IRolAdmin {
  id: number;
  key: string;
  name: string;
}

interface IEstatusEmpleado {
  id: number;
  clave: string;
  nombre: string;
  activo: boolean;
}

@Component({
  selector: 'app-empleados',
  standalone: true,
  imports: [MaterialModule, EstatusComponent, BannerComponent],
  templateUrl: './empleados.component.html',
  styleUrl: './empleados.component.scss',
  animations: [modalScaleFade, backdropFade, fadeSlideIn],
})
export class EmpleadosComponent implements OnInit, AfterViewInit {
  private supabase = inject(EmpleadosService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  displayedColumns: string[] = ['id', 'nombre', 'cargo', 'email', 'estatus', 'acceso', 'acciones'];
  dataSource = new MatTableDataSource<IEmpleadoAdmin>([]);

  cargando = false;
  cargandoRoles = false;
  cargandoCargos = false;
  guardando = false;
  actualizandoEstatusId: number | null = null;
  eliminandoEmpleadoId: number | null = null;
  empleadoEditandoId: number | null = null;
  modalEmpleadoAbierto = false;
  modalInhabilitarAbierto = false;
  modalQuitarAccesoAbierto = false;
  modalEliminarAbierto = false;
  modalContrasenaTemporalAbierto = false;
  modalFirmaAbierto = false;
  empleadoPendienteInhabilitar: IEmpleadoAdmin | null = null;
  empleadoPendienteQuitarAcceso: IEmpleadoAdmin | null = null;
  empleadoPendienteEliminar: IEmpleadoAdmin | null = null;
  empleadoFirmaSeleccionado: IEmpleadoAdmin | null = null;
  error = '';
  mensaje = '';
  contrasenaTemporal = '';
  contrasenaTemporalCopiada = false;
  cargosDisponibles: ICargoEmpresa[] = [];
  rolesDisponibles: IRolAdmin[] = [];
  estatusDisponibles: IEstatusEmpleado[] = [];
  rolesSeleccionados: number | null = null;

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    cargo_id: [null as number | null],
    telefono: ['', [Validators.maxLength(20), Validators.pattern(/^[0-9+()\-\s]*$/)]],
    email: ['', [Validators.email, Validators.maxLength(180)]],
  });

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  async ngOnInit() {
    this.dataSource.filterPredicate = (data, filter) =>
      this.normalizar(data.id).includes(filter) ||
      this.normalizar(data.nombre).includes(filter) ||
      this.normalizar(data.cargo).includes(filter) ||
      this.normalizar(data.email).includes(filter) ||
      this.normalizar(this.obtenerEtiquetaEstatus(data)).includes(filter);

    this.dataSource.sortingDataAccessor = (data: IEmpleadoAdmin, sortHeaderId: string) => {
      if (sortHeaderId === 'id') return data.id;
      if (sortHeaderId === 'nombre') return this.normalizar(data.nombre);
      if (sortHeaderId === 'cargo') return this.normalizar(data.cargo);
      if (sortHeaderId === 'email') return this.normalizar(data.email);
      if (sortHeaderId === 'estatus') return this.normalizar(this.obtenerEtiquetaEstatus(data));
      if (sortHeaderId === 'acceso') return data.primera_vez_login ? 2 : data.auth_user_id ? 1 : 0;
      return '';
    };

    await this.cargarEmpleados();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  get estaEditando(): boolean {
    return this.empleadoEditandoId !== null;
  }

  abrirFirma(empleado: IEmpleadoAdmin): void {
    this.empleadoFirmaSeleccionado = empleado;
    this.modalFirmaAbierto = true;
  }

  cerrarModalFirma(): void {
    this.modalFirmaAbierto = false;
    this.empleadoFirmaSeleccionado = null;
  }

  async guardarEmpleado() {
    this.error = '';
    this.mensaje = '';
    this.contrasenaTemporal = '';
    this.contrasenaTemporalCopiada = false;
    this.modalContrasenaTemporalAbierto = false;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const nombre = String(this.form.get('nombre')?.value ?? '').trim();
    const cargo_id = this.parseNumber(this.form.get('cargo_id')?.value);
    const telefono = String(this.form.get('telefono')?.value ?? '').trim();
    const email = String(this.form.get('email')?.value ?? '').trim().toLowerCase();
    if (!nombre) {
      this.error = 'El nombre es obligatorio.';
      this.form.get('nombre')?.markAsTouched();
      return;
    }

    const roleId = Number(this.rolesSeleccionados);

    if (Number.isFinite(roleId) && roleId > 0 && !email) {
      this.error = 'Agrega un email de acceso para poder asignar roles.';
      this.form.get('email')?.markAsTouched();
      return;
    }

    this.guardando = true;
    try {
      let empleado: IEmpleadoAdmin;
      let contrasenaTemporalGenerada = '';
      let debeMostrarContrasenaTemporal = false;

      if (this.estaEditando && this.empleadoEditandoId !== null) {
        empleado = await this.supabase.actualizarEmpleadoAdmin(this.empleadoEditandoId, { nombre, cargo_id, telefono }) as IEmpleadoAdmin;
        this.mensaje = 'Empleado actualizado correctamente.';
      } else {
        empleado = await this.supabase.crearEmpleadoAdmin({ nombre, cargo_id, telefono }) as IEmpleadoAdmin;
        this.mensaje = 'Empleado creado correctamente.';
      }

      if (email) {
        const respuesta = await this.supabase.guardarAccesoEmpleadoAdmin({
          empleadoId: empleado.id,
          email,
          nombre,
          roleId: Number.isFinite(roleId) && roleId > 0 ? roleId : null,
        });
        contrasenaTemporalGenerada = String(respuesta?.temporaryPassword ?? '').trim();
        debeMostrarContrasenaTemporal = Boolean(contrasenaTemporalGenerada);
        this.contrasenaTemporal = contrasenaTemporalGenerada;
        this.contrasenaTemporalCopiada = false;
        this.mensaje = this.estaEditando
          ? 'Empleado y acceso actualizados correctamente.'
          : 'Empleado creado con acceso correctamente.';
        this.mostrarToast({
          title: 'Acceso guardado',
          message: this.mensaje,
          variant: 'success',
        });
      }

      this.cerrarModalEmpleado(true);
      await this.cargarEmpleados();

      if (debeMostrarContrasenaTemporal) {
        this.abrirModalContrasenaTemporal(contrasenaTemporalGenerada);
      }
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo guardar el empleado.';
    } finally {
      this.guardando = false;
    }
  }

  async editarEmpleado(item: IEmpleadoAdmin) {
    this.error = '';
    this.mensaje = '';
    this.contrasenaTemporal = '';
    this.contrasenaTemporalCopiada = false;
    this.modalContrasenaTemporalAbierto = false;
    this.modalEmpleadoAbierto = true;
    this.empleadoEditandoId = item.id;
    await this.cargarCargosDisponibles();
    await this.cargarRolesDisponibles();
    this.form.patchValue({
      nombre: item.nombre,
      cargo_id: item.cargo_id ?? null,
      telefono: item.telefono ?? '',
      email: item.email ?? '',
    });

    try {
      const roleIds = await this.supabase.rolesEmpleadoAdmin(item.id);
      this.rolesSeleccionados = roleIds[0] ?? null;
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron cargar los roles del empleado.';
      this.rolesSeleccionados = null;
    }
  }

  async cambiarEstatusEmpleado(item: IEmpleadoAdmin) {
    this.error = '';
    this.mensaje = '';

    if (this.esEmpleadoProtegido(item)) {
      this.error = 'El empleado "Otro" no se puede inhabilitar.';
      return;
    }

    const inhabilitar = !this.estaInhabilitado(item);
    if (inhabilitar) {
      this.abrirModalInhabilitar(item);
      return;
    }

    await this.aplicarCambioEstatus(item, false);
  }

  abrirModalQuitarAcceso(item: IEmpleadoAdmin) {
    this.error = '';
    this.mensaje = '';

    if (this.esEmpleadoProtegido(item)) {
      this.error = 'El empleado "Otro" no puede quedarse sin acceso.';
      return;
    }

    if (!item.auth_user_id) {
      this.error = 'Este empleado no tiene acceso asignado.';
      return;
    }

    this.modalQuitarAccesoAbierto = true;
    this.empleadoPendienteQuitarAcceso = item;
  }

  cerrarModalQuitarAcceso() {
    this.modalQuitarAccesoAbierto = false;
    this.empleadoPendienteQuitarAcceso = null;
  }

  async confirmarQuitarAcceso() {
    if (!this.empleadoPendienteQuitarAcceso || this.eliminandoEmpleadoId !== null) return;

    this.eliminandoEmpleadoId = this.empleadoPendienteQuitarAcceso.id;
    this.error = '';
    this.mensaje = '';

    try {
      await this.supabase.quitarAccesoEmpleadoAdmin(this.empleadoPendienteQuitarAcceso.id);
      this.mensaje = 'Acceso quitado correctamente.';
      this.mostrarToast({
        title: 'Acceso eliminado',
        message: 'Se removio el usuario de este empleado.',
        variant: 'warning',
      });

      if (this.empleadoEditandoId === this.empleadoPendienteQuitarAcceso.id) {
        this.cerrarModalEmpleado();
      }

      this.cerrarModalQuitarAcceso();
      await this.cargarEmpleados();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo quitar el acceso del empleado.';
    } finally {
      this.eliminandoEmpleadoId = null;
    }
  }

  abrirModalEliminar(item: IEmpleadoAdmin) {
    this.error = '';
    this.mensaje = '';

    if (this.esEmpleadoProtegido(item)) {
      this.error = 'El empleado "Otro" no se puede eliminar.';
      return;
    }

    this.modalEliminarAbierto = true;
    this.empleadoPendienteEliminar = item;
  }

  cerrarModalEliminar() {
    this.modalEliminarAbierto = false;
    this.empleadoPendienteEliminar = null;
  }

  async confirmarEliminar() {
    if (!this.empleadoPendienteEliminar || this.eliminandoEmpleadoId !== null) return;

    this.eliminandoEmpleadoId = this.empleadoPendienteEliminar.id;
    this.error = '';
    this.mensaje = '';

    try {
      await this.supabase.eliminarEmpleadoAdmin(this.empleadoPendienteEliminar.id);
      this.mensaje = 'Empleado eliminado correctamente.';

      if (this.empleadoEditandoId === this.empleadoPendienteEliminar.id) {
        this.cerrarModalEmpleado();
      }

      this.cerrarModalEliminar();
      await this.cargarEmpleados();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo eliminar el empleado.';
    } finally {
      this.eliminandoEmpleadoId = null;
    }
  }

  abrirModalInhabilitar(item: IEmpleadoAdmin) {
    this.modalInhabilitarAbierto = true;
    this.empleadoPendienteInhabilitar = item;
  }

  cerrarModalInhabilitar() {
    this.modalInhabilitarAbierto = false;
    this.empleadoPendienteInhabilitar = null;
  }

  async confirmarInhabilitar() {
    if (!this.empleadoPendienteInhabilitar) return;
    await this.aplicarCambioEstatus(this.empleadoPendienteInhabilitar, true);
    this.cerrarModalInhabilitar();
  }

  async abrirModalNuevoEmpleado() {
    this.error = '';
    this.contrasenaTemporal = '';
    this.contrasenaTemporalCopiada = false;
    this.modalContrasenaTemporalAbierto = false;
    await this.cargarCargosDisponibles();
    await this.cargarRolesDisponibles();
    this.rolesSeleccionados = this.obtenerRolPorDefecto();
    this.form.reset({
      nombre: '',
      cargo_id: null,
      telefono: '',
      email: '',
    });
    this.empleadoEditandoId = null;
    this.modalEmpleadoAbierto = true;
  }

  cerrarModalEmpleado(preservarContrasenaTemporal = false) {
    this.modalEmpleadoAbierto = false;
    this.empleadoEditandoId = null;
    if (!preservarContrasenaTemporal) {
      this.contrasenaTemporal = '';
      this.modalContrasenaTemporalAbierto = false;
    }
    this.rolesSeleccionados = null;
    this.form.reset({
      nombre: '',
      cargo_id: null,
      telefono: '',
      email: '',
    });
  }

  cerrarModalContrasenaTemporal() {
    this.modalContrasenaTemporalAbierto = false;
    this.contrasenaTemporal = '';
    this.contrasenaTemporalCopiada = false;
  }

  private abrirModalContrasenaTemporal(contrasena: string) {
    this.contrasenaTemporal = contrasena;
    this.contrasenaTemporalCopiada = false;
    this.modalContrasenaTemporalAbierto = false;

    setTimeout(() => {
      this.modalContrasenaTemporalAbierto = true;
    }, 0);
  }

  async copiarContrasenaTemporal() {
    if (!this.contrasenaTemporal) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(this.contrasenaTemporal);
      } else {
        this.copiarTextoFallback(this.contrasenaTemporal);
      }

      this.contrasenaTemporalCopiada = true;
    } catch {
      this.copiarTextoFallback(this.contrasenaTemporal);
      this.contrasenaTemporalCopiada = true;
    }
  }

  aplicarFiltro(event: Event) {
    const value = (event.target as HTMLInputElement)?.value ?? '';
    this.dataSource.filter = this.normalizar(value);
    this.dataSource.paginator?.firstPage();
  }

  esEmpleadoProtegido(item: IEmpleadoAdmin): boolean {
    return this.normalizar(item?.nombre) === 'otro';
  }

  estaInhabilitado(item: IEmpleadoAdmin): boolean {
    return this.obtenerClaveEstatus(item) !== 'activo';
  }

  obtenerEtiquetaEstatus(item: IEmpleadoAdmin): string {
    return this.estatusDisponibles.find((estatus) => estatus.id === Number(item?.estatus_id))?.nombre ?? 'Sin estatus';
  }

  compareById(a: number | null, b: number | null): boolean {
    return Number(a) === Number(b);
  }

  private async aplicarCambioEstatus(item: IEmpleadoAdmin, inhabilitar: boolean) {
    this.actualizandoEstatusId = item.id;
    try {
      const claveDestino = inhabilitar ? 'inactivo' : 'activo';
      const estatusDestino = this.estatusDisponibles.find(
        (estatus) => estatus.clave === claveDestino && estatus.activo
      );
      if (!estatusDestino) {
        throw new Error(`No existe un estatus ${claveDestino} habilitado.`);
      }

      await this.supabase.actualizarEstatusEmpleadoAdmin(
        item.id,
        estatusDestino.id
      );

      this.mostrarToast({
        title: inhabilitar ? 'Empleado inhabilitado' : 'Empleado habilitado',
        message: inhabilitar
          ? 'El empleado fue marcado como inactivo correctamente.'
          : 'El empleado ya puede acceder al sistema nuevamente.',
        variant: inhabilitar ? 'warning' : 'success',
      });

      if (this.empleadoEditandoId === item.id) {
        this.cerrarModalEmpleado();
      }

      await this.cargarEmpleados();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo actualizar el estatus del empleado.';
    } finally {
      this.actualizandoEstatusId = null;
    }
  }

  private async cargarEmpleados() {
    this.cargando = true;
    this.error = '';

    try {
      const [{ data, error }, estatus] = await Promise.all([
        this.supabase.empleados({ incluirInhabilitados: true }),
        this.supabase.obtenerEstatusEmpleadoAdmin()
      ]);
      if (error) throw error;

      this.estatusDisponibles = estatus.map((item: any) => ({
        id: Number(item.id),
        clave: String(item.clave ?? '').trim().toLowerCase(),
        nombre: String(item.nombre ?? '').trim() || 'Sin nombre',
        activo: Boolean(item.activo)
      }));

      this.dataSource.data = (data ?? []).map((item: any) => ({
        id: Number(item.id),
        nombre: String(item.nombre ?? ''),
        cargo_id: Number.isFinite(Number(item.cargo_id)) ? Number(item.cargo_id) : null,
        cargo: item.cargo?.rol ? String(item.cargo.rol) : null,
        telefono: item.telefono ? String(item.telefono) : null,
        estatus_id: Number.isFinite(Number(item.estatus_id)) ? Number(item.estatus_id) : null,
        email: item.email ? String(item.email) : null,
        auth_user_id: item.auth_user_id ? String(item.auth_user_id) : null,
        primera_vez_login: Boolean(item.primera_vez_login)
      }));
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo cargar el concentrado de empleados.';
    } finally {
      this.cargando = false;
    }
  }

  private async cargarRolesDisponibles() {
    if (this.rolesDisponibles.length || this.cargandoRoles) {
      return;
    }

    this.cargandoRoles = true;

    try {
      const { data, error } = await this.supabase.rolesAdmin();
      if (error) throw error;

      this.rolesDisponibles = (data ?? []).map((item: any) => ({
        id: Number(item.id),
        key: String(item.key ?? ''),
        name: String(item.name ?? item.key ?? ''),
      }));
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron cargar los roles disponibles.';
    } finally {
      this.cargandoRoles = false;
    }
  }

  private async cargarCargosDisponibles() {
    if (this.cargosDisponibles.length || this.cargandoCargos) {
      return;
    }

    this.cargandoCargos = true;

    try {
      const { data, error } = await this.supabase.rolesEmpresaAdmin();
      if (error) throw error;

      this.cargosDisponibles = (data ?? []).map((item: any) => ({
        id: Number(item.id),
        rol: String(item.rol ?? '').trim(),
        descripcion_rol: String(item.descripcion_rol ?? '').trim(),
        estatus: Boolean(item.estatus)
      }));
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron cargar los cargos disponibles.';
    } finally {
      this.cargandoCargos = false;
    }
  }

  private obtenerRolPorDefecto(): number | null {
    const rolEmpleado = this.rolesDisponibles.find((item) => item.key === 'empleado');
    return rolEmpleado ? rolEmpleado.id : null;
  }

  private parseNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  getCargoLabel(item: IEmpleadoAdmin): string {
    return item.cargo?.trim() || 'Sin cargo';
  }

  getCargoSeleccionadoLabel(): string {
    const cargoId = Number(this.form.get('cargo_id')?.value);
    const cargo = this.cargosDisponibles.find((item) => item.id === cargoId);
    return cargo?.rol?.trim() || 'Sin cargo';
  }

  private normalizar(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private obtenerClaveEstatus(item: IEmpleadoAdmin): string {
    return this.estatusDisponibles.find((estatus) => estatus.id === Number(item?.estatus_id))?.clave ?? '';
  }

  private mostrarToast(data: {
    title: string;
    message: string;
    variant: 'success' | 'warning';
  }) {
    this.snackBar.openFromComponent(EmpleadoToastComponent, {
      data,
      duration: 3500,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['tp-snackbar'],
    });
  }

  private copiarTextoFallback(value: string) {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}
