import { Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-tp-textarea',
  standalone: true,
  templateUrl: './tp-textarea.component.html',
  styleUrl: './tp-textarea.component.scss',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TpTextareaComponent), multi: true }]
})
export class TpTextareaComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() required = false;
  @Input() rows = 5;
  @Input() maxLength: number | null = null;
  @Input() error = '';
  @Output() blur = new EventEmitter<void>();
  value = '';
  disabled = false;
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void { this.value = value ?? ''; }
  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }
  actualizar(value: string): void { this.value = value; this.onChange(value); }
  marcarTouched(): void { this.onTouched(); this.blur.emit(); }
}
