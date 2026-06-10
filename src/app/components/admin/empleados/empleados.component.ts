import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { SupabaseService } from 'app/core/supabase.service';
import { EstatusComponent } from 'app/shared/estatus/estatus.component';
import { MaterialModule } from 'app/shared/material.module';

interface IEmpleadoAdmin {
  id: number;
  nombre: string;
  estatus_id: number | null;
}

@Component({
  selector: 'app-empleados',
  standalone: true,
  imports: [MaterialModule, EstatusComponent],
  templateUrl: './empleados.component.html',
  styleUrl: './empleados.component.scss'
})
export class EmpleadosComponent implements OnInit, AfterViewInit {
  private readonly ESTATUS_ACTIVO = 1;
  private readonly ESTATUS_INHABILITADO = 2;

  private supabase = inject(SupabaseService);
  private fb = inject(FormBuilder);

  displayedColumns: string[] = ['id', 'nombre', 'estatus', 'acciones'];
  dataSource = new MatTableDataSource<IEmpleadoAdmin>([]);

  cargando = false;
  guardando = false;
  actualizandoEstatusId: number | null = null;
  eliminandoEmpleadoId: number | null = null;
  empleadoEditandoId: number | null = null;
  modalEmpleadoAbierto = false;
  modalInhabilitarAbierto = false;
  modalEliminarAbierto = false;
  empleadoPendienteInhabilitar: IEmpleadoAdmin | null = null;
  empleadoPendienteEliminar: IEmpleadoAdmin | null = null;
  error = '';
  mensaje = '';

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]]
  });

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  async ngOnInit() {
    this.dataSource.filterPredicate = (data, filter) =>
      this.normalizar(data.id).includes(filter) ||
      this.normalizar(data.nombre).includes(filter) ||
      this.normalizar(this.obtenerEtiquetaEstatus(data)).includes(filter);

    this.dataSource.sortingDataAccessor = (data: IEmpleadoAdmin, sortHeaderId: string) => {
      if (sortHeaderId === 'id') return data.id;
      if (sortHeaderId === 'nombre') return this.normalizar(data.nombre);
      if (sortHeaderId === 'estatus') return this.normalizar(this.obtenerEtiquetaEstatus(data));
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

  async guardarEmpleado() {
    this.error = '';
    this.mensaje = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const nombre = String(this.form.get('nombre')?.value ?? '').trim();
    if (!nombre) {
      this.error = 'El nombre es obligatorio.';
      this.form.get('nombre')?.markAsTouched();
      return;
    }

    this.guardando = true;
    try {
      if (this.estaEditando && this.empleadoEditandoId !== null) {
        await this.supabase.actualizarEmpleadoAdmin(this.empleadoEditandoId, { nombre });
        this.mensaje = 'Empleado actualizado correctamente.';
      } else {
        await this.supabase.crearEmpleadoAdmin({ nombre });
        this.mensaje = 'Empleado creado correctamente.';
      }

      this.cerrarModalEmpleado();
      await this.cargarEmpleados();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo guardar el empleado.';
    } finally {
      this.guardando = false;
    }
  }

  editarEmpleado(item: IEmpleadoAdmin) {
    this.error = '';
    this.mensaje = '';
    this.modalEmpleadoAbierto = true;
    this.empleadoEditandoId = item.id;
    this.form.patchValue({ nombre: item.nombre });
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

  abrirModalNuevoEmpleado() {
    this.error = '';
    this.form.reset();
    this.empleadoEditandoId = null;
    this.modalEmpleadoAbierto = true;
  }

  cerrarModalEmpleado() {
    this.modalEmpleadoAbierto = false;
    this.empleadoEditandoId = null;
    this.form.reset();
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
    return Number(item?.estatus_id) === this.ESTATUS_INHABILITADO;
  }

  obtenerEtiquetaEstatus(item: IEmpleadoAdmin): string {
    return this.estaInhabilitado(item) ? 'INACTIVO' : 'ACTIVO';
  }

  private async aplicarCambioEstatus(item: IEmpleadoAdmin, inhabilitar: boolean) {
    this.actualizandoEstatusId = item.id;
    try {
      await this.supabase.actualizarEstatusEmpleadoAdmin(
        item.id,
        inhabilitar ? this.ESTATUS_INHABILITADO : this.ESTATUS_ACTIVO
      );

      this.mensaje = inhabilitar
        ? 'Empleado inhabilitado correctamente.'
        : 'Empleado habilitado correctamente.';

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
      const { data, error } = await this.supabase.empleados({ incluirInhabilitados: true });
      if (error) throw error;

      this.dataSource.data = (data ?? []).map((item: any) => ({
        id: Number(item.id),
        nombre: String(item.nombre ?? ''),
        estatus_id: Number.isFinite(Number(item.estatus_id)) ? Number(item.estatus_id) : null
      }));
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo cargar el concentrado de empleados.';
    } finally {
      this.cargando = false;
    }
  }

  private normalizar(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
  }
}
