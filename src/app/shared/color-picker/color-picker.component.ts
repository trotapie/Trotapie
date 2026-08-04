import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, ViewChild, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-color-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="color-picker" [class.color-picker--disabled]="disabled">
      <button
        class="color-picker__swatch"
        type="button"
        [style.background-color]="value"
        [disabled]="disabled"
        [attr.aria-label]="label || 'Seleccionar color'"
        (click)="openPicker()"
      >
        <span class="color-picker__swatch-icon" aria-hidden="true">&#9998;</span>
      </button>
      <div class="color-picker__value">
        <span class="color-picker__eyebrow">HEX</span>
        <input
          type="text"
          inputmode="text"
          maxlength="7"
          autocomplete="off"
          spellcheck="false"
          [value]="value"
          [disabled]="disabled"
          [attr.aria-label]="(label || 'Color') + ' en formato HEX'"
          (input)="onHexInput($any($event.target).value)"
          (blur)="normalizeHex()"
          (keydown.enter)="normalizeHex()"
        />
      </div>
      <input
        #nativeColorInput
        class="color-picker__native"
        type="color"
        [value]="value"
        [disabled]="disabled"
        [attr.aria-label]="label || 'Seleccionar color'"
        (input)="onNativeInput($any($event.target).value)"
      />
    </div>
  `,
  styleUrl: './color-picker.component.scss',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ColorPickerComponent), multi: true }]
})
export class ColorPickerComponent implements ControlValueAccessor {
  @Input() label = '';
  @ViewChild('nativeColorInput') private nativeColorInput?: ElementRef<HTMLInputElement>;

  value = '#FFFFFF';
  disabled = false;
  private onChange = (_value: string) => {};
  private onTouched = () => {};

  writeValue(value: string | null | undefined): void {
    this.value = this.normalize(value);
  }

  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; }

  openPicker(): void {
    if (!this.disabled) this.nativeColorInput?.nativeElement.click();
  }

  onNativeInput(value: string): void {
    this.setValue(value);
  }

  onHexInput(value: string): void {
    const normalized = value.startsWith('#') ? value : `#${value}`;
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) this.setValue(normalized);
    else this.value = normalized.slice(0, 7).toUpperCase();
  }

  normalizeHex(): void {
    const normalized = this.normalize(this.value);
    this.value = normalized;
    this.onTouched();
  }

  private setValue(value: string): void {
    this.value = this.normalize(value);
    this.onChange(this.value);
    this.onTouched();
  }

  private normalize(value: string | null | undefined): string {
    const normalized = String(value ?? '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toUpperCase() : '#FFFFFF';
  }
}
