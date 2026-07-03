import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MaterialModule } from 'app/shared/material.module';
import { FlyerElement } from '../../models/flyer-element.interface';

@Component({
  selector: 'app-flyer-layers',
  standalone: true,
  imports: [MaterialModule],
  template: `
    <div>
      <p class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
        Capas ({{ elements.length }})
      </p>

      <div class="space-y-1 max-h-60 overflow-auto">
        @for (el of reversedElements; track el.id; let i = $index) {
          <div class="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm hover:bg-gray-100 transition-colors"
            [class.bg-blue-50]="selectedId === el.id"
            [class.text-blue-700]="selectedId === el.id"
            (click)="selectLayer.emit(el.id)">
            <mat-icon class="icon-size-4 text-gray-400 shrink-0">
              {{ iconForType(el.type) }}
            </mat-icon>
            <span class="truncate flex-1">{{ labelForElement(el) }}</span>
            <span class="text-xs text-gray-400">{{ elements.length - 1 - i }}</span>
          </div>
        }

        @if (!elements.length) {
          <p class="text-xs text-gray-400 py-2 text-center">Sin elementos</p>
        }
      </div>

      @if (elements.length > 1) {
        <div class="flex items-center gap-1 mt-2">
          <button mat-icon-button [matTooltip]="'Subir capa'" (click)="bringForward.emit()" class="icon-size-7">
            <mat-icon class="icon-size-4">expand_less</mat-icon>
          </button>
          <button mat-icon-button [matTooltip]="'Bajar capa'" (click)="sendBackwards.emit()" class="icon-size-7">
            <mat-icon class="icon-size-4">expand_more</mat-icon>
          </button>
          <button mat-icon-button [matTooltip]="'Al frente'" (click)="moveToTop.emit()" class="icon-size-7">
            <mat-icon class="icon-size-4">vertical_align_top</mat-icon>
          </button>
          <button mat-icon-button [matTooltip]="'Al fondo'" (click)="moveToBottom.emit()" class="icon-size-7">
            <mat-icon class="icon-size-4">vertical_align_bottom</mat-icon>
          </button>
        </div>
      }
    </div>
  `,
  styles: [':host { display: block; }']
})
export class LayersPanelComponent {
  @Input() elements: FlyerElement[] = [];
  @Input() selectedId: string | null = null;
  @Output() selectLayer = new EventEmitter<string>();
  @Output() bringForward = new EventEmitter<void>();
  @Output() sendBackwards = new EventEmitter<void>();
  @Output() moveToTop = new EventEmitter<void>();
  @Output() moveToBottom = new EventEmitter<void>();

  get reversedElements() {
    return [...this.elements].reverse();
  }

  iconForType(type: FlyerElement['type']): string {
    const icons: Record<string, string> = {
      text: 'font_download',
      image: 'image',
      rectangle: 'check_box_outline_blank',
      circle: 'circle_outline',
      line: 'horizontal_rule',
      price: 'attach_money',
    };
    return icons[type] || 'widgets';
  }

  labelForElement(el: FlyerElement): string {
    const typeLabels: Record<string, string> = {
      text: 'Texto',
      image: 'Imagen',
      rectangle: 'Rectángulo',
      circle: 'Círculo',
      line: 'Línea',
      price: 'Precio',
    };
    const text = el.fabricConfig?.text || el.fabricConfig?.src || '';
    const preview = typeof text === 'string' ? text.slice(0, 20) : '';
    return preview ? `${typeLabels[el.type] || el.type}: ${preview}` : typeLabels[el.type] || el.type;
  }
}
