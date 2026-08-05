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
  @Input() required = false;
  @Input() min: number | null = null;
  @Input() max: number | null = null;
  @Input() maxLength: number | null = null;
  @Input() error = '';
  @Output() blur = new EventEmitter<void>();
  value = '';
  disabled = false;
  private onChange: (value: string | number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  writeValue(value: string | number | null): void { this.value = value === null || value === undefined ? '' : String(value); }
  registerOnChange(fn: (value: string | number | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }
  actualizar(value: string): void { this.value = value; this.onChange(this.type === 'number' ? (value === '' ? null : Number(value)) : value); }
  marcarTouched(): void { this.onTouched(); this.blur.emit(); }
}
