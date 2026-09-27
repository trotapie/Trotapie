import { CommonModule } from '@angular/common';
import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { MaterialModule } from 'app/shared/material.module';
import { TpSelectSearchComponent, TpSelectSearchOption } from 'app/shared/tp-select-search/tp-select-search.component';

@Component({
  selector: 'app-time-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, OverlayModule, TpSelectSearchComponent],
  templateUrl: './time-picker.component.html',
  styleUrl: './time-picker.component.scss',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => TimePickerComponent),
    multi: true
  }]
})
export class TimePickerComponent implements ControlValueAccessor {
  private static nextId = 0;

  @Input() label = 'Hora límite';
  @Input() allowEmpty = false;
  readonly labelId = `time-picker-label-${TimePickerComponent.nextId++}`;

  readonly horas = Array.from({ length: 12 }, (_, index) => index + 1);
  readonly minutos = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
  readonly periodos = ['AM', 'PM'];
  readonly horasOpciones: TpSelectSearchOption[] = this.horas.map((hora) => ({ value: hora, label: String(hora) }));
  readonly minutosOpciones: TpSelectSearchOption[] = this.minutos.map((minuto) => ({ value: minuto, label: minuto }));
  readonly periodosOpciones: TpSelectSearchOption[] = this.periodos.map((periodo) => ({ value: periodo, label: periodo }));
  readonly posiciones: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -8 }
  ];

  hora = 12;
  minuto = '00';
  periodo = 'AM';
  disabled = false;
  sinHora = false;
  abierto = false;

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  get valorVisible(): string {
    return this.allowEmpty && this.sinHora ? 'Seleccionar hora' : `${this.hora}:${this.minuto} ${this.periodo}`;
  }

  writeValue(value: string | null): void {
    this.sinHora = !value;
    const match = String(value ?? '00:00').match(/^(\d{1,2}):(\d{2})$/);
    const horas24 = Number(match?.[1] ?? 0);

    this.hora = horas24 % 12 || 12;
    this.minuto = match?.[2] ?? '00';
    this.periodo = horas24 < 12 ? 'AM' : 'PM';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
  }

  actualizarHora(): void {
    this.sinHora = false;
    const horas24 = (this.hora % 12) + (this.periodo === 'PM' ? 12 : 0);
    this.onChange(`${String(horas24).padStart(2, '0')}:${this.minuto}`);
  }

  seleccionarHora(value: string | number | null): void {
    if (value === null) return;
    this.hora = Number(value);
    this.actualizarHora();
  }

  seleccionarMinuto(value: string | number | null): void {
    if (value === null) return;
    this.minuto = String(value);
    this.actualizarHora();
  }

  seleccionarPeriodo(value: string | number | null): void {
    if (value === null) return;
    this.periodo = String(value);
    this.actualizarHora();
  }

  cerrar(): void {
    this.abierto = false;
    this.marcarTocado();
  }

  limpiarHora(): void {
    this.sinHora = true;
    this.onChange('');
    this.marcarTocado();
  }

  marcarTocado(): void {
    this.onTouched();
  }
}
