import { Component, HostListener, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { ConfiguracionHoteles, ConfiguracionHotelesService } from 'app/core/configuracion-hoteles.service';
import { MaterialModule } from 'app/shared/material.module';
import { TimePickerComponent } from 'app/shared/time-picker/time-picker.component';
import { TpInputComponent } from 'app/shared/tp-input/tp-input.component';
import { TpTextareaComponent } from 'app/shared/tp-textarea/tp-textarea.component';
import { TpToastService } from 'app/shared/tp-toast/tp-toast.service';

@Component({
  selector: 'app-configuracion-hoteles',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MaterialModule, TimePickerComponent, TpInputComponent, TpTextareaComponent],
  templateUrl: './configuracion-hoteles.component.html'
})
export class ConfiguracionHotelesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(ConfiguracionHotelesService);
  private readonly toast = inject(TpToastService);
  private readonly confirmacion = inject(FuseConfirmationService);
  readonly idiomas = [
    { codigo: 'es', nombre: 'Español' }, { codigo: 'en', nombre: 'Inglés' },
    { codigo: 'fr', nombre: 'Francés' }, { codigo: 'pt', nombre: 'Portugués' },
    { codigo: 'de', nombre: 'Alemán' }
  ];
  readonly camposHorario = [
    { clave: 'check_in_desde', label: 'Check-in desde' },
    { clave: 'check_in_hasta', label: 'Check-in hasta' },
    { clave: 'check_out', label: 'Check-out' },
    { clave: 'desayuno_desde', label: 'Desayuno desde' },
    { clave: 'desayuno_hasta', label: 'Desayuno hasta' }
  ] as const;
  readonly form = this.fb.group({
    horarios: this.fb.nonNullable.group({
      check_in_desde: [''], check_in_hasta: [''], check_out: [''], desayuno_desde: [''], desayuno_hasta: ['']
    }),
    textos: this.fb.array(this.idiomas.map(() => this.fb.nonNullable.group({
      titulo: ['', Validators.maxLength(120)],
      destacado: ['', Validators.maxLength(120)],
      mensaje: ['', Validators.maxLength(500)]
    })))
  });
  cargando = true;
  guardando = false;
  errorCarga = '';
  private configuracion: ConfiguracionHoteles | null = null;
  private guardado: ReturnType<typeof this.form.getRawValue> | null = null;

  get hayCambios(): boolean {
    return !!this.guardado && JSON.stringify(this.form.getRawValue()) !== JSON.stringify(this.guardado);
  }

  get sinHorarios(): boolean {
    return !Object.values(this.form.controls.horarios.getRawValue()).some(Boolean);
  }

  ngOnInit(): void { void this.cargar(); }

  async cargar(): Promise<void> {
    this.cargando = true;
    this.errorCarga = '';
    this.form.disable();
    try {
      this.configuracion = await this.servicio.obtener();
      const horarios = this.configuracion.horarios;
      this.form.reset({
        horarios: {
          check_in_desde: horarios?.check_in_desde ?? '', check_in_hasta: horarios?.check_in_hasta ?? '',
          check_out: horarios?.check_out ?? '', desayuno_desde: horarios?.desayuno_desde ?? '',
          desayuno_hasta: horarios?.desayuno_hasta ?? ''
        },
        textos: this.idiomas.map(({ codigo }) => ({
          titulo: this.configuracion.textos[codigo]?.titulo ?? '',
          destacado: this.configuracion.textos[codigo]?.destacado ?? '',
          mensaje: this.configuracion.textos[codigo]?.mensaje ?? ''
        }))
      });
      this.guardado = this.form.getRawValue();
    } catch (error) {
      console.error('Error al cargar la configuración global de hoteles.', error);
      this.errorCarga = 'No se pudo cargar la configuración. Verifica la conexión y que la migración de configuración global de hoteles esté aplicada en Supabase.';
    } finally {
      this.cargando = false;
      if (!this.errorCarga) this.form.enable();
    }
  }

  async guardar(): Promise<void> {
    if (this.guardando || this.cargando || this.errorCarga || !this.hayCambios) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.guardando = true;
    const valores = this.form.getRawValue();
    this.form.disable();
    const textos = { ...this.configuracion?.textos };
    this.idiomas.forEach(({ codigo }, index) => { textos[codigo] = valores.textos[index]; });
    try {
      await this.servicio.guardar({ horarios: valores.horarios, textos });
      this.configuracion = { horarios: valores.horarios, textos };
      this.guardado = valores;
      this.form.markAsPristine();
      this.toast.show({ variant: 'success', title: 'Configuración guardada', message: 'Los cambios se mostrarán al abrir o recargar las fichas de los hoteles.' });
    } catch (error) {
      console.error('Error al guardar la configuración global de hoteles.', error);
      this.toast.show({ variant: 'error', title: 'No se pudo guardar', message: 'Verifica tu conexión y tus permisos de administrador. Tus cambios se conservan para reintentar.' });
    } finally {
      this.guardando = false;
      this.form.enable();
    }
  }

  cancelar(): void {
    if (this.guardado && !this.guardando) this.form.reset(this.guardado);
  }

  errorCampo(control: AbstractControl): string {
    return control.touched && control.hasError('maxlength') ? 'El texto supera el máximo permitido.' : '';
  }

  async puedeSalir(): Promise<boolean> {
    if (this.guardando) return false;
    if (!this.hayCambios) return true;
    const resultado = await firstValueFrom(this.confirmacion.open({
      title: 'Cambios sin guardar', message: '¿Quieres salir y descartar los cambios de la configuración global?',
      actions: { confirm: { label: 'Descartar cambios' }, cancel: { label: 'Seguir editando' } }
    }).afterClosed());
    return resultado === 'confirmed';
  }

  @HostListener('window:beforeunload', ['$event'])
  antesDeCerrar(event: BeforeUnloadEvent): void {
    if (this.hayCambios || this.guardando) { event.preventDefault(); event.returnValue = ''; }
  }
}
