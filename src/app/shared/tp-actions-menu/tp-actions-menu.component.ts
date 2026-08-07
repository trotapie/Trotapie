import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface TpActionMenuItem {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  danger?: boolean;
}

@Component({
  selector: 'app-tp-actions-menu',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, OverlayModule],
  templateUrl: './tp-actions-menu.component.html',
  styleUrl: './tp-actions-menu.component.scss'
})
export class TpActionsMenuComponent {
  @Input() actions: TpActionMenuItem[] = [];
  @Input() ariaLabel = 'Abrir acciones';
  @Input() tooltip = 'Acciones';
  @Input() disabled = false;

  @Output() actionSelected = new EventEmitter<string>();

  abierto = false;
  readonly posiciones: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 }
  ];

  alternar(): void {
    if (!this.disabled) this.abierto = !this.abierto;
  }

  cerrar(): void {
    this.abierto = false;
  }

  seleccionar(action: TpActionMenuItem): void {
    if (action.disabled) return;
    this.actionSelected.emit(action.id);
    this.cerrar();
  }
}
