import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

interface CountryDialCode {
  country: string;
  dialCode: string;
}

@Component({
  selector: 'app-phone-input',
  standalone: true,
  templateUrl: './phone-input.component.html',
  styleUrl: './phone-input.component.scss',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => PhoneInputComponent),
    multi: true,
  }],
})
export class PhoneInputComponent implements ControlValueAccessor {
  @Input() label = 'Número de teléfono';
  @Input() placeholder = 'Número de teléfono';
  @Input() invalid = false;
  @Input() bookingStyle = false;
  @Input() set dialCode(value: string) {
    this.selectedDialCode = value || '52';
  }
  @Output() readonly dialCodeChange = new EventEmitter<string>();

  readonly countryDialCodes: CountryDialCode[] = [
    { country: 'Argentina', dialCode: '54' },
    { country: 'Australia', dialCode: '61' },
    { country: 'Austria', dialCode: '43' },
    { country: 'Belgium', dialCode: '32' },
    { country: 'Bolivia', dialCode: '591' },
    { country: 'Brazil', dialCode: '55' },
    { country: 'Bulgaria', dialCode: '359' },
    { country: 'Canada', dialCode: '1' },
    { country: 'Chile', dialCode: '56' },
    { country: 'China', dialCode: '86' },
    { country: 'Colombia', dialCode: '57' },
    { country: 'Costa Rica', dialCode: '506' },
    { country: 'Cuba', dialCode: '53' },
    { country: 'Dominican Republic', dialCode: '1' },
    { country: 'Ecuador', dialCode: '593' },
    { country: 'El Salvador', dialCode: '503' },
    { country: 'France', dialCode: '33' },
    { country: 'Germany', dialCode: '49' },
    { country: 'Guatemala', dialCode: '502' },
    { country: 'Honduras', dialCode: '504' },
    { country: 'India', dialCode: '91' },
    { country: 'Ireland', dialCode: '353' },
    { country: 'Italy', dialCode: '39' },
    { country: 'Japan', dialCode: '81' },
    { country: 'Mexico', dialCode: '52' },
    { country: 'Netherlands', dialCode: '31' },
    { country: 'Nicaragua', dialCode: '505' },
    { country: 'Norway', dialCode: '47' },
    { country: 'Panama', dialCode: '507' },
    { country: 'Paraguay', dialCode: '595' },
    { country: 'Peru', dialCode: '51' },
    { country: 'Portugal', dialCode: '351' },
    { country: 'Puerto Rico', dialCode: '1' },
    { country: 'South Korea', dialCode: '82' },
    { country: 'Spain', dialCode: '34' },
    { country: 'Switzerland', dialCode: '41' },
    { country: 'Thailand', dialCode: '66' },
    { country: 'Turkey', dialCode: '90' },
    { country: 'United Arab Emirates', dialCode: '971' },
    { country: 'United Kingdom', dialCode: '44' },
    { country: 'United States', dialCode: '1' },
    { country: 'Uruguay', dialCode: '598' },
    { country: 'Venezuela', dialCode: '58' },
  ];

  value = '';
  selectedDialCode = '52';
  disabled = false;

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value = this.onlyDigits(value ?? '');
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

  updatePhone(event: Event): void {
    this.value = this.onlyDigits((event.target as HTMLInputElement).value);
    this.onChange(this.value);
  }

  updateDialCode(event: Event): void {
    this.selectedDialCode = (event.target as HTMLSelectElement).value;
    this.dialCodeChange.emit(this.selectedDialCode);
  }

  touch(): void {
    this.onTouched();
  }

  private onlyDigits(value: string): string {
    return value.replace(/\D/g, '').slice(0, 15);
  }
}
