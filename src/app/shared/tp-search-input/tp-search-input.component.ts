import { Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-tp-search-input',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './tp-search-input.component.html',
  styleUrl: './tp-search-input.component.scss',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TpSearchInputComponent), multi: true }]
})
export class TpSearchInputComponent implements ControlValueAccessor {
  @Input() label = 'Buscar';
  @Input() placeholder = 'Buscar';
  @Input() searchAriaLabel = 'Buscar';
  @Output() search = new EventEmitter<string>();

  valor = '';
  disabled = false;

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.valor = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  actualizarValor(value: string): void {
    this.valor = value;
    this.onChange(value);
  }

  ejecutarBusqueda(): void {
    this.onTouched();
    this.search.emit(this.valor.trim());
  }

  marcarTouched(): void {
    this.onTouched();
  }

  limpiar(): void {
    this.actualizarValor('');
    this.ejecutarBusqueda();
  }
}
