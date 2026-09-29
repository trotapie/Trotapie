import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

interface CalendarDay {
  key: string;
  number: number;
  currentMonth: boolean;
}

@Component({
  selector: 'app-tp-date-input',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatMenuModule],
  templateUrl: './tp-date-input.component.html',
  styleUrl: './tp-date-input.component.scss',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TpDateInputComponent), multi: true }]
})
export class TpDateInputComponent implements ControlValueAccessor {
  private static nextId = 0;
  readonly labelId = `tp-date-input-${TpDateInputComponent.nextId++}`;
  readonly weekdays = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
  readonly todayKey = this.keyFromDate(new Date());

  @Input() label = '';
  @Input() required = false;
  @Input() error = '';
  @Input() min = '';
  @Input() max = '';

  value = '';
  disabled = false;
  visibleMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  get monthLabel(): string {
    return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(this.visibleMonth);
  }

  get days(): CalendarDay[] {
    const year = this.visibleMonth.getFullYear();
    const month = this.visibleMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(year, month, index - firstWeekday + 1);
      return { key: this.keyFromDate(date), number: date.getDate(), currentMonth: date.getMonth() === month };
    });
  }

  get formattedValue(): string {
    if (!this.value) return 'dd/mm/aaaa';
    const [year, month, day] = this.value.split('-');
    return `${day}/${month}/${year}`;
  }

  writeValue(value: string | null): void {
    this.value = this.isValidDate(value) ? value! : '';
    if (this.value) this.showSelectedMonth();
  }

  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; }

  showSelectedMonth(): void {
    const key = this.value || this.todayKey;
    const [year, month] = key.split('-').map(Number);
    this.visibleMonth = new Date(year, month - 1, 1);
  }

  moveMonth(offset: number): void {
    this.visibleMonth = new Date(this.visibleMonth.getFullYear(), this.visibleMonth.getMonth() + offset, 1);
  }

  isUnavailable(day: CalendarDay): boolean {
    return !day.currentMonth || (!!this.min && day.key < this.min) || (!!this.max && day.key > this.max);
  }

  choose(key: string): void {
    this.value = key;
    this.onChange(key);
    this.onTouched();
  }

  clear(): void {
    this.choose('');
  }

  markTouched(): void { this.onTouched(); }

  private isValidDate(value: string | null): boolean {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }

  private keyFromDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
