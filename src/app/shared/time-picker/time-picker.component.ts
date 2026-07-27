import { CommonModule } from '@angular/common';
import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MaterialModule } from 'app/shared/material.module';

@Component({
  selector: 'app-time-picker',
  standalone: true,
  imports: [CommonModule, MaterialModule],
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
  readonly labelId = `time-picker-label-${TimePickerComponent.nextId++}`;

  readonly horas = Array.from({ length: 12 }, (_, index) => index + 1);
  readonly minutos = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
  readonly periodos = ['AM', 'PM'];

  hora = 12;
  minuto = '00';
  periodo = 'AM';
  disabled = false;

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  get valorVisible(): string {
    return `${this.hora}:${this.minuto} ${this.periodo}`;
  }

  writeValue(value: string | null): void {
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
    const horas24 = (this.hora % 12) + (this.periodo === 'PM' ? 12 : 0);
    this.onChange(`${String(horas24).padStart(2, '0')}:${this.minuto}`);
  }

  marcarTocado(): void {
    this.onTouched();
  }
}
