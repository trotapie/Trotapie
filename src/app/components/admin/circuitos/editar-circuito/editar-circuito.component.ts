import { Component, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { MaterialModule } from 'app/shared/material.module';
import { CircuitosService } from 'app/core/circuitos.service';

@Component({
  selector: 'app-editar-circuito',
  standalone: true,
  imports: [MaterialModule, RouterLink],
  templateUrl: './editar-circuito.component.html',
  styleUrl: './editar-circuito.component.scss',
})
export class EditarCircuitoComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly circuitosService = inject(CircuitosService);
  private readonly fb = inject(FormBuilder);

  circuitoId: number | null = null;
  esCreacion = false;
  cargando = true;
  guardando = false;
  error = '';
  mostrarModalExito = false;
  mensajeModalExito = 'Circuito actualizado correctamente.';
  mostrarModalCambiosPendientes = false;
  private snapshotEstadoInicial = '';

  form = this.fb.group({
    nombre: ['', [Validators.required]],
    descripcion: [''],
    precio_total: [null as number | null, [Validators.required, Validators.min(0)]],
    duracion_dias: [null as number | null, [Validators.required, Validators.min(1)]],
    duracion_noches: [null as number | null, [Validators.required, Validators.min(0)]],
    imagen_principal: [''],
    activo: [true],
  });

  get tieneCambiosPendientes(): boolean {
    return this.snapshotEstadoInicial !== '' && !this.cargando &&
      this.serializarEstadoActual() !== this.snapshotEstadoInicial;
  }

  async ngOnInit() {
    const idRaw = (this.route.snapshot.paramMap.get('id') ?? '').trim();
    this.esCreacion = idRaw.toLowerCase() === 'nuevo';

    try {
      if (this.esCreacion) {
        this.marcarEstadoGuardado();
        return;
      }

      const id = Number(idRaw);
      if (!Number.isFinite(id)) throw new Error('No se encontro el circuito a editar.');

      this.circuitoId = id;
      const circuito = await this.circuitosService.infoCircuito(id, 'es');
      if (!circuito) throw new Error('No se encontro el circuito solicitado.');

      this.form.patchValue({
        nombre: circuito.nombre ?? '',
        descripcion: circuito.descripcion ?? '',
        precio_total: circuito.precio_total ?? null,
        duracion_dias: circuito.duracion_dias ?? null,
        duracion_noches: circuito.duracion_noches ?? null,
        imagen_principal: circuito.imagen_principal ?? '',
        activo: circuito.activo ?? true,
      });

      this.marcarEstadoGuardado();
    } catch (err: any) {
      this.error = err?.message ?? 'No se pudo cargar la informacion del circuito.';
    } finally {
      this.cargando = false;
    }
  }

  ngOnDestroy(): void {}

  @HostListener('window:beforeunload', ['$event'])
  handleBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.tieneCambiosPendientes || this.guardando) return;
    event.preventDefault();
    event.returnValue = 'Tienes cambios pendientes.';
  }

  async guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando = true;
    this.error = '';
    this.mostrarModalExito = false;

    try {
      const raw = this.form.getRawValue();
      const payload = {
        nombre: (raw.nombre ?? '').trim(),
        descripcion: (raw.descripcion ?? '').trim(),
        precio_total: Number(raw.precio_total),
        duracion_dias: Number(raw.duracion_dias) || 1,
        duracion_noches: Number(raw.duracion_noches) || 0,
        imagen_principal: (raw.imagen_principal ?? '').trim(),
        activo: raw.activo ?? true,
      };

      if (this.esCreacion) {
        const id = await this.circuitosService.crearCircuito({
          ...payload,
          destinos: [],
          hoteles: [],
          actividades: [],
          imagenes: [],
          traducciones: [],
        });
        this.circuitoId = id;
        this.esCreacion = false;
        this.mensajeModalExito = 'Circuito creado correctamente.';
      } else {
        const id = Number(this.circuitoId);
        if (!Number.isFinite(id)) throw new Error('No se encontro el circuito a editar.');

        await this.circuitosService.actualizarCircuito(id, {
          ...payload,
          destinos: [],
          hoteles: [],
          actividades: [],
          imagenes: [],
          traducciones: [],
        });
        this.mensajeModalExito = 'Circuito actualizado correctamente.';
      }

      this.marcarEstadoGuardado();
      this.error = '';
      this.mostrarModalExito = true;
    } catch (err: any) {
      this.error = err?.message ?? 'No se pudo guardar el circuito.';
    } finally {
      this.guardando = false;
    }
  }

  solicitarRegresar() {
    if (this.guardando) return;
    if (!this.tieneCambiosPendientes) { this.regresar(); return; }
    this.mostrarModalCambiosPendientes = true;
  }

  cerrarModalCambiosPendientes() { this.mostrarModalCambiosPendientes = false; }

  descartarCambiosYRegresar() {
    this.mostrarModalCambiosPendientes = false;
    this.regresar();
  }

  guardarCambiosPendientesYRegresar() {
    if (!this.tieneCambiosPendientes || this.guardando) return;
    this.mostrarModalCambiosPendientes = false;
    this.guardar();
  }

  regresar() {
    this.router.navigate(['/admin/circuitos']);
  }

  cerrarModalExito() {
    this.mostrarModalExito = false;
    this.regresar();
  }

  private marcarEstadoGuardado(): void {
    this.snapshotEstadoInicial = this.serializarEstadoActual();
  }

  private serializarEstadoActual(): string {
    const raw = this.form.getRawValue();
    return JSON.stringify({
      nombre: (raw.nombre ?? '').trim(),
      descripcion: (raw.descripcion ?? '').trim(),
      precio_total: raw.precio_total,
      duracion_dias: raw.duracion_dias,
      duracion_noches: raw.duracion_noches,
      imagen_principal: (raw.imagen_principal ?? '').trim(),
      activo: raw.activo,
    });
  }
}
