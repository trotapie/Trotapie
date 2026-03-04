import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[porcentajeBlur]',
  standalone: true,
})
export class PorcentajeBlurDirective {

  @Input() pctMin = 0;
  @Input() pctMax = 100;
  @Input() pctShowSymbol = true;

  private el: HTMLInputElement;

  constructor(
    private host: ElementRef<HTMLInputElement>,
    private ngControl: NgControl
  ) {
    this.el = this.host.nativeElement;
  }

  @HostListener('focus')
  onFocus(): void {
    const raw = (this.el.value ?? '').replace('%', '').trim();
    this.el.value = raw;
  }

  @HostListener('input')
  onInput(): void {
    // Solo números
    let cleaned = this.el.value.replace(/\D/g, '');

    if (cleaned !== this.el.value) {
      this.el.value = cleaned;
    }

    const num = cleaned ? Number(cleaned) : null;
    this.ngControl?.control?.setValue(num, { emitEvent: true });
  }

  @HostListener('blur')
  onBlur(): void {
    const raw = (this.el.value ?? '').replace(/\D/g, '');

    if (!raw) {
      this.el.value = '';
      this.ngControl?.control?.setValue(null, { emitEvent: true });
      return;
    }

    let num = Number(raw);

    // Clamp al rango
    if (num < this.pctMin) num = this.pctMin;
    if (num > this.pctMax) num = this.pctMax;

    this.ngControl?.control?.setValue(num, { emitEvent: true });

    this.el.value = this.pctShowSymbol ? `${num}%` : String(num);
  }
}