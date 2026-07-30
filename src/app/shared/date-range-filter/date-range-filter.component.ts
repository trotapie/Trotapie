import { Component, Input, QueryList, ViewChildren, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatMenuTrigger } from '@angular/material/menu';
import { MaterialModule } from 'app/shared/material.module';
import { DateRangeFilterValue, EMPTY_DATE_RANGE } from './date-range-filter.model';
import { DateRangeEndpoint, emptyDateRange, selectDateInRange } from './date-range-selection.util';

interface CalendarDay {
  key: string;
  day: number;
  currentMonth: boolean;
}

@Component({
  selector: 'app-date-range-filter',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './date-range-filter.component.html',
  styleUrl: './date-range-filter.component.scss',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => DateRangeFilterComponent),
    multi: true,
  }],
})
export class DateRangeFilterComponent implements ControlValueAccessor {
  private static nextId = 0;

  @Input() label = 'Rango de fechas';
  @Input() mostrarEstadia = false;
  @Input() min: Date | null = null;
  @Input() max: Date | null = null;

  readonly labelId = `date-range-filter-label-${DateRangeFilterComponent.nextId++}`;
  readonly weekdays = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
  visibleMonth = this.startOfMonth(new Date());
  value: DateRangeFilterValue = { ...EMPTY_DATE_RANGE };
  pendingValue: DateRangeFilterValue = { ...EMPTY_DATE_RANGE };
  disabled = false;
  activeEndpoint: DateRangeEndpoint = 'start';

  @ViewChildren(MatMenuTrigger) private readonly menuTriggers!: QueryList<MatMenuTrigger>;

  private onChange: (value: DateRangeFilterValue) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  get months(): Date[] {
    return [this.visibleMonth, this.addMonths(this.visibleMonth, 1)];
  }

  get triggerValue(): string {
    if (!this.value.start || !this.value.end) return '';

    const range = `${this.formatDate(this.value.start)} - ${this.formatDate(this.value.end)}`;
    const nights = this.nights(this.value);
    return this.mostrarEstadia ? `${range} (${nights} ${nights === 1 ? 'noche' : 'noches'})` : range;
  }

  get estadiaLabel(): string {
    if (!this.pendingValue.start || !this.pendingValue.end) return 'Selecciona inicio y fin';

    const nights = this.nights(this.pendingValue);
    return `Estadía de ${nights} ${nights === 1 ? 'noche' : 'noches'}`;
  }

  writeValue(value: DateRangeFilterValue | null): void {
    const nextValue = value ?? emptyDateRange();
    this.value = { start: nextValue.start ?? null, end: nextValue.end ?? null };
    this.pendingValue = { ...this.value };

    if (this.value.start) {
      this.visibleMonth = this.startOfMonth(this.dateFromKey(this.value.start));
    }
  }

  registerOnChange(fn: (value: DateRangeFilterValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
  }

  open(endpoint: DateRangeEndpoint): void {
    this.activeEndpoint = endpoint;
    this.pendingValue = { ...this.value };
  }

  select(day: CalendarDay): void {
    if (!day.currentMonth || this.isDisabled(day.key)) return;
    const selectingFirstDate = !this.pendingValue.start;
    this.pendingValue = selectDateInRange(this.pendingValue, day.key, this.activeEndpoint);

    if (this.activeEndpoint === 'start' || selectingFirstDate) {
      this.activeEndpoint = 'end';
    }
  }

  clear(): void {
    this.pendingValue = emptyDateRange();
  }

  apply(): void {
    this.value = { ...this.pendingValue };
    this.onChange({ ...this.value });
    this.onTouched();
    this.menuTriggers.forEach(trigger => trigger.closeMenu());
  }

  moveMonth(offset: number): void {
    this.visibleMonth = this.addMonths(this.visibleMonth, offset);
  }

  daysForMonth(month: Date): CalendarDay[] {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstWeekday = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const previousMonthDays = new Date(year, monthIndex, 0).getDate();
    const days: CalendarDay[] = [];

    for (let index = 0; index < 42; index++) {
      const dayNumber = index - firstWeekday + 1;
      const date = new Date(year, monthIndex, dayNumber);
      days.push({
        key: this.keyFromDate(date),
        day: dayNumber < 1 ? previousMonthDays + dayNumber : dayNumber > daysInMonth ? dayNumber - daysInMonth : dayNumber,
        currentMonth: dayNumber >= 1 && dayNumber <= daysInMonth,
      });
    }

    return days;
  }

  isStart(key: string): boolean {
    return this.pendingValue.start === key;
  }

  isEnd(key: string): boolean {
    return this.pendingValue.end === key;
  }

  isInRange(key: string): boolean {
    return !!this.pendingValue.start && !!this.pendingValue.end && key > this.pendingValue.start && key < this.pendingValue.end;
  }

  isDisabled(key: string): boolean {
    const date = this.dateFromKey(key);
    return (this.min ? date < this.startOfDay(this.min) : false) || (this.max ? date > this.startOfDay(this.max) : false);
  }

  monthLabel(month: Date): string {
    return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(month);
  }

  formatDate(key: string): string {
    const [year, month, day] = key.split('-');
    return `${day}/${month}/${year}`;
  }

  nights(range: DateRangeFilterValue): number {
    if (!range.start || !range.end) return 0;

    return Math.round(
      (this.dateFromKey(range.end).getTime() - this.dateFromKey(range.start).getTime()) / 86_400_000,
    );
  }

  private keyFromDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private dateFromKey(key: string): Date {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private addMonths(date: Date, offset: number): Date {
    return new Date(date.getFullYear(), date.getMonth() + offset, 1);
  }
}
