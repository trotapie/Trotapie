import { Component, EventEmitter, forwardRef, Input, OnDestroy, Output } from '@angular/core';
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
export class TpSearchInputComponent implements ControlValueAccessor, OnDestroy {
  @Input() label = 'Buscar';
  @Input() placeholder = 'Buscar';
  @Input() searchAriaLabel = 'Buscar';
  @Input() searchDelay = 0;
  @Output() search = new EventEmitter<string>();

  valor = '';
  disabled = false;

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private searchTimer?: ReturnType<typeof setTimeout>;

  ngOnDestroy(): void {
    this.cancelarBusquedaProgramada();
  }

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
    this.programarBusqueda();
  }

  ejecutarBusqueda(): void {
    this.cancelarBusquedaProgramada();
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

  private programarBusqueda(): void {
    if (!this.searchDelay || this.disabled) return;
    this.cancelarBusquedaProgramada();
    this.searchTimer = setTimeout(() => this.ejecutarBusqueda(), this.searchDelay);
  }

  private cancelarBusquedaProgramada(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = undefined;
  }
}
