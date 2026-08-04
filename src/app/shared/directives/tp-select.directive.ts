import { Directive, OnInit, inject } from '@angular/core';
import { MatSelect } from '@angular/material/select';

@Directive({
  selector: 'mat-select[tpSelect]',
  standalone: true,
  host: {
    class: 'tp-select'
  }
})
export class TpSelectDirective implements OnInit {
  private readonly select = inject(MatSelect);

  ngOnInit(): void {
    const panelClasses = this.select.panelClass;
    const classes = typeof panelClasses === 'string'
      ? panelClasses.split(' ')
      : Array.isArray(panelClasses)
        ? panelClasses
        : [];

    this.select.panelClass = [...new Set([...classes, 'tp-select-panel'])];
  }
}
