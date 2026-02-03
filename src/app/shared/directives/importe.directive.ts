import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[importeMxnBlur]',
  standalone: true,
})
export class ImporteMxnBlurDirective {
  private el = inject(ElementRef<HTMLInputElement>);
  private ngControl = inject(NgControl, { optional: true });

  private readonly prefix = '$';

  @HostListener('input')
  onInput(): void {
    const input = this.el.nativeElement;

    // mientras escribe: permite números + un punto + hasta 2 decimales (SIN $)
    const raw = this.stripFormat(input.value);
    const clean = this.sanitizeDecimal(raw);

    input.value = clean;
    this.setControlValue(clean || null);
  }

  @HostListener('focus')
  onFocus(): void {
    const input = this.el.nativeElement;

    // al enfocar: quita $, comas y ".00" (si existe)
    const raw = this.stripFormat(input.value).replace(/\.00$/, '');
    input.value = raw;
  }

  @HostListener('blur')
  onBlur(): void {
    const input = this.el.nativeElement;
    const raw = this.sanitizeDecimal(this.stripFormat(input.value));

    if (!raw) {
      input.value = '';
      this.setControlValue(null);
      return;
    }

    // Soporta "12." o ".5"
    const normalized = raw.startsWith('.') ? `0${raw}` : raw;
    const n = Number(normalized);
    if (Number.isNaN(n)) return;

    const fixed = n.toFixed(2);           // "11.00"
    input.value = this.formatMxn(fixed);  // "$ 11.00"

    // 👇 aquí decide qué quieres guardar en el formControl:
    // Opción A (recomendada): guardar número "limpio" -> "11.00"
    this.setControlValue(input.value);

    // Opción B: guardar formateado -> "$ 11.00"
    // this.setControlValue(input.value);
  }

  private sanitizeDecimal(value: string): string {
    // 1) deja solo dígitos y punto
    let v = (value ?? '').replace(/[^\d.]/g, '');

    // 2) deja solo el primer punto
    const firstDot = v.indexOf('.');
    if (firstDot !== -1) {
      v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
    }

    // 3) máximo 2 decimales
    const [intPart, decPart] = v.split('.');
    if (decPart !== undefined) {
      return `${intPart}.${decPart.slice(0, 2)}`;
    }
    return intPart;
  }

  private stripFormat(value: string): string {
    return (value ?? '')
      .replaceAll(this.prefix, '')
      .replace(/\s/g, '')
      .replace(/,/g, '');
  }

  private formatMxn(value: string): string {
    const [intPart, decPart] = value.split('.');
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${this.prefix} ${withCommas}.${decPart ?? '00'}`;
  }

  private setControlValue(value: string | null): void {
    const ctrl = this.ngControl?.control;
    if (!ctrl) return;

    ctrl.setValue(value, { emitEvent: false });
    ctrl.markAsDirty();
  }
}