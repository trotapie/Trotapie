import { Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-custom-switch',
  standalone: true,
  template: `
    <div class="switch-row">
      @if (label) {
        <span class="switch-label">{{ label }}</span>
      }
      <label class="switch">
        <input type="checkbox" [checked]="value" [disabled]="disabled" [attr.aria-label]="label" (change)="update($any($event.target).checked)" />
        <div class="slider">
          <div class="circle">
            <svg class="cross" viewBox="0 0 365.696 365.696" aria-hidden="true"><path fill="currentColor" d="M243.188 182.86 356.32 69.726c12.5-12.5 12.5-32.766 0-45.247L341.238 9.398c-12.504-12.503-32.77-12.503-45.25 0L182.86 122.528 69.727 9.374c-12.5-12.5-32.766-12.5-45.247 0L9.375 24.457c-12.5 12.504-12.5 32.77 0 45.25l113.152 113.152L9.398 295.99c-12.503 12.503-12.503 32.769 0 45.25L24.48 356.32c12.5 12.5 32.766 12.5 45.247 0l113.132-113.132L295.99 356.32c12.503 12.5 32.769 12.5 45.25 0l15.081-15.082c12.5-12.504 12.5-32.77 0-45.25z" /></svg>
            <svg class="checkmark" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.707 19.121a.997.997 0 0 1-1.414 0l-5.646-5.647a1.5 1.5 0 0 1 0-2.121l.707-.707a1.5 1.5 0 0 1 2.121 0L9 14.171l9.525-9.525a1.5 1.5 0 0 1 2.121 0l.707.707a1.5 1.5 0 0 1 0 2.121z" /></svg>
          </div>
        </div>
      </label>
    </div>
  `,
  styles: [`
    .switch-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .switch-label { font-size: 14px; color: #374151; }
    .switch { --switch-width: 46px; --switch-height: 24px; --switch-bg: rgb(131, 131, 131); --switch-checked-bg: rgb(0, 218, 80); --circle-diameter: 18px; --switch-offset: calc((var(--switch-height) - var(--circle-diameter)) / 2); --switch-transition: all .2s cubic-bezier(.27,.2,.25,1.51); --circle-bg: #fff; --circle-shadow: 1px 1px 2px rgba(146,146,146,.45); --circle-checked-shadow: -1px 1px 2px rgba(163,163,163,.45); display: inline-block; }
    .switch input { position: absolute; opacity: 0; width: 1px; height: 1px; }
    .switch svg { transition: var(--switch-transition); position: absolute; height: auto; }
    .switch .checkmark { width: 10px; color: var(--switch-checked-bg); transform: scale(0); }
    .switch .cross { width: 6px; color: var(--switch-bg); }
    .slider { box-sizing: border-box; width: var(--switch-width); height: var(--switch-height); background: var(--switch-bg); border-radius: 999px; display: flex; align-items: center; position: relative; transition: var(--switch-transition); cursor: pointer; }
    .circle { width: var(--circle-diameter); height: var(--circle-diameter); background: var(--circle-bg); border-radius: inherit; box-shadow: var(--circle-shadow); display: flex; align-items: center; justify-content: center; transition: var(--switch-transition); z-index: 1; position: absolute; left: var(--switch-offset); }
    .slider::before { content: ''; position: absolute; width: calc(var(--circle-diameter) / 2); height: calc(var(--circle-diameter) / 4 - 1px); left: calc(var(--switch-offset) + var(--circle-diameter) / 4); background: var(--circle-bg); border-radius: 1px; transition: all .2s ease-in-out; }
    .switch input:checked + .slider { background: var(--switch-checked-bg); }
    .switch input:checked + .slider .checkmark { transform: scale(1); }
    .switch input:checked + .slider .cross { transform: scale(0); }
    .switch input:checked + .slider::before { left: calc(100% - var(--circle-diameter) / 2 - var(--circle-diameter) / 4 - var(--switch-offset)); }
    .switch input:checked + .slider .circle { left: calc(100% - var(--circle-diameter) - var(--switch-offset)); box-shadow: var(--circle-checked-shadow); }
    .switch input:focus-visible + .slider { outline: 2px solid #2563eb; outline-offset: 2px; }
    .switch input:disabled + .slider { cursor: not-allowed; opacity: .55; }
  `],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CustomSwitchComponent), multi: true }],
})
export class CustomSwitchComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() disabled = false;
  @Input() set checked(checked: boolean) { this.value = Boolean(checked); }
  @Output() change = new EventEmitter<boolean>();

  value = false;
  private onChange = (_value: boolean) => {};
  private onTouched = () => {};

  writeValue(value: boolean): void { this.value = Boolean(value); }
  registerOnChange(fn: (value: boolean) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; }

  update(value: boolean): void {
    this.value = value;
    this.onChange(value);
    this.onTouched();
    this.change.emit(value);
  }
}
