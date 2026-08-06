import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, forwardRef, Input, Output, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

export interface TpSelectSearchOption {
  value: string | number;
  label: string;
  group?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-tp-select-search',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatInputModule, OverlayModule],
  templateUrl: './tp-select-search.component.html',
  styleUrl: './tp-select-search.component.scss',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TpSelectSearchComponent), multi: true }]
})
export class TpSelectSearchComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = 'Seleccionar';
  @Input() searchPlaceholder = 'Buscar opciones';
  @Input() emptyMessage = 'No hay opciones que coincidan.';
  @Input() options: TpSelectSearchOption[] = [];
  @Input() required = false;
  @Input() disabled = false;
  @Input() bookingStyle = false;
  @Output() selectionChange = new EventEmitter<string | number | null>();
  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;

  abierto = false;
  busqueda = '';
  valorSeleccionado: string | number | null = null;
  readonly posiciones: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -8 }
  ];
  private onChange: (value: string | number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  get opcionesFiltradas(): TpSelectSearchOption[] {
    const filtro = this.busqueda.trim().toLocaleLowerCase();
    return filtro ? this.options.filter((option) => option.label.toLocaleLowerCase().includes(filtro)) : this.options;
  }

  get textoSeleccion(): string {
    return this.options.find((option) => this.sameValue(option.value, this.valorSeleccionado))?.label ?? this.placeholder;
  }

  writeValue(value: string | number | null): void { this.valorSeleccionado = value; }
  registerOnChange(fn: (value: string | number | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }

  abrir(): void {
    if (this.disabled) return;
    this.abierto = true;
    setTimeout(() => this.searchInput?.nativeElement.focus());
  }

  cerrar(): void {
    this.abierto = false;
    this.busqueda = '';
    this.onTouched();
  }

  seleccionar(option: TpSelectSearchOption): void {
    if (option.disabled) return;
    this.valorSeleccionado = option.value;
    this.onChange(option.value);
    this.selectionChange.emit(option.value);
    this.cerrar();
  }

  limpiar(): void {
    this.valorSeleccionado = null;
    this.onChange(null);
    this.selectionChange.emit(null);
    this.cerrar();
  }

  trackByValue(_: number, option: TpSelectSearchOption): string | number { return option.value; }
  sameValue(left: string | number | null, right: string | number | null): boolean { return String(left) === String(right); }
}
