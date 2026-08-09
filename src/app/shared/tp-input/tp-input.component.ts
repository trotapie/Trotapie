import { Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-tp-input',
  standalone: true,
  templateUrl: './tp-input.component.html',
  styleUrl: './tp-input.component.scss',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TpInputComponent), multi: true }]
})
export class TpInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() type = 'text';
  @Input() inputMode = '';
  @Input() numeric = false;
  @Input() required = false;
  @Input() min: number | null = null;
  @Input() max: number | null = null;
  @Input() step: number | null = null;
  @Input() maxLength: number | null = null;
  @Input() error = '';
  @Input() preserveNumericInputWhileFocused = false;
  @Input() bookingStyle = false;
  @Input() multiline = false;
  @Input() rows = 3;
  @Output() blur = new EventEmitter<void>();
  @Output() valueChange = new EventEmitter<string>();
  @Input() value = '';
  disabled = false;
  private focused = false;
  private onChange: (value: string | number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private get esNumerico(): boolean { return this.type === 'number' || this.numeric; }
  writeValue(value: string | number | null): void {
    if (this.preserveNumericInputWhileFocused && this.focused) {
      return;
    }

    this.value = value === null || value === undefined ? '' : String(value);
  }
  registerOnChange(fn: (value: string | number | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }
  actualizar(value: string, input?: HTMLInputElement | HTMLTextAreaElement): void {
    this.value = value;
    if (this.esNumerico) {
      const numero = value === '' ? null : Number(value);
      const limitado = numero !== null && Number.isFinite(numero)
        ? Math.min(this.max ?? Number.POSITIVE_INFINITY, Math.max(this.min ?? Number.NEGATIVE_INFINITY, numero))
        : numero;

      if (limitado !== numero) {
        this.value = String(limitado);
        if (input) {
          input.value = this.value;
        }
      }

      this.onChange(limitado);
    } else {
      this.onChange(value);
    }
    this.valueChange.emit(value);
  }
  enfocar(): void { this.focused = true; }
  marcarTouched(): void {
    this.focused = false;
    if (this.esNumerico && this.value !== '') {
      this.value = String(Number(this.value));
    }
    this.onTouched();
    this.blur.emit();
  }
}
