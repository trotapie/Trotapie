import { CommonModule } from '@angular/common';
import { Component, ElementRef, forwardRef, Input, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';

export interface TpMultiselectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-tp-multiselect',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCheckboxModule, MatIconModule, MatInputModule, OverlayModule],
  templateUrl: './tp-multiselect.component.html',
  styleUrl: './tp-multiselect.component.scss',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TpMultiselectComponent), multi: true }]
})
export class TpMultiselectComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = 'Seleccionar';
  @Input() searchPlaceholder = 'Buscar opciones';
  @Input() emptyMessage = 'No hay opciones que coincidan.';
  @Input() options: TpMultiselectOption[] = [];
  @Input() required = false;

  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;

  abierto = false;
  busqueda = '';
  valoresSeleccionados: Array<string | number> = [];
  disabled = false;

  readonly posiciones: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -8 }
  ];

  private onChange: (value: Array<string | number>) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  get opcionesFiltradas(): TpMultiselectOption[] {
    const filtro = this.busqueda.trim().toLocaleLowerCase();
    if (!filtro) return this.options;
    return this.options.filter((option) => option.label.toLocaleLowerCase().includes(filtro));
  }

  get opcionesDisponibles(): TpMultiselectOption[] {
    return this.opcionesFiltradas.filter((option) => !option.disabled);
  }

  get todasLasVisiblesSeleccionadas(): boolean {
    return this.opcionesDisponibles.length > 0 && this.opcionesDisponibles.every((option) => this.estaSeleccionada(option.value));
  }

  get textoSeleccion(): string {
    if (!this.valoresSeleccionados.length) return this.placeholder;
    if (this.valoresSeleccionados.length === 1) {
      return this.options.find((option) => this.sameValue(option.value, this.valoresSeleccionados[0]))?.label ?? '1 seleccionado';
    }
    return `${this.valoresSeleccionados.length} seleccionados`;
  }

  writeValue(value: Array<string | number> | null): void {
    this.valoresSeleccionados = Array.isArray(value) ? [...value] : [];
  }

  registerOnChange(fn: (value: Array<string | number>) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

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

  alternar(option: TpMultiselectOption): void {
    if (option.disabled) return;

    const index = this.valoresSeleccionados.findIndex((value) => this.sameValue(value, option.value));
    if (index >= 0) {
      this.valoresSeleccionados = this.valoresSeleccionados.filter((_, itemIndex) => itemIndex !== index);
    } else {
      this.valoresSeleccionados = [...this.valoresSeleccionados, option.value];
    }

    this.onChange([...this.valoresSeleccionados]);
  }

  estaSeleccionada(value: string | number): boolean {
    return this.valoresSeleccionados.some((selected) => this.sameValue(selected, value));
  }

  alternarTodas(): void {
    const todosSeleccionados = this.opcionesDisponibles.length > 0 &&
      this.opcionesDisponibles.every((option) => this.estaSeleccionada(option.value));

    if (todosSeleccionados) {
      const visibles = new Set(this.opcionesDisponibles.map((option) => String(option.value)));
      this.valoresSeleccionados = this.valoresSeleccionados.filter((value) => !visibles.has(String(value)));
    } else {
      const valores = new Set(this.valoresSeleccionados.map((value) => String(value)));
      this.opcionesDisponibles.forEach((option) => valores.add(String(option.value)));
      this.valoresSeleccionados = this.options
        .filter((option) => valores.has(String(option.value)))
        .map((option) => option.value);
    }

    this.onChange([...this.valoresSeleccionados]);
  }

  limpiar(): void {
    if (!this.valoresSeleccionados.length) return;
    this.valoresSeleccionados = [];
    this.onChange([]);
  }

  trackByValue(_: number, option: TpMultiselectOption): string | number {
    return option.value;
  }

  private sameValue(left: string | number, right: string | number): boolean {
    return String(left) === String(right);
  }
}
