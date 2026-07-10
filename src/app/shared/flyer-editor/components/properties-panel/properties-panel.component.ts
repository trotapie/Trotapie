import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from 'app/shared/material.module';
import { CustomSwitchComponent } from 'app/shared/custom-switch/custom-switch.component';
import { FlyerElement } from '../../models/flyer-element.interface';

@Component({
  selector: 'app-flyer-properties',
  standalone: true,
  imports: [MaterialModule, FormsModule, CustomSwitchComponent],
  template: `
    <div>
      <p class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Propiedades</p>

      @if (!element) {
        <p class="text-xs text-gray-400 text-center py-4">Selecciona un elemento</p>
      } @else {
        <div class="space-y-3">

          @if (isText) {
            <mat-form-field class="w-full fuse-mat-dense" subscriptSizing="dynamic">
              <mat-label>Texto</mat-label>
              <input matInput [ngModel]="element.fabricConfig.text"
                (ngModelChange)="onChange('text', $event)" />
            </mat-form-field>

            <div class="grid grid-cols-2 gap-2">
              <mat-form-field class="fuse-mat-dense" subscriptSizing="dynamic">
                <mat-label>Tamaño</mat-label>
                <input matInput type="number" [ngModel]="element.fabricConfig.fontSize"
                  (ngModelChange)="onChange('fontSize', Number($event))" />
              </mat-form-field>

              <mat-form-field class="fuse-mat-dense" subscriptSizing="dynamic">
                <mat-label>Color</mat-label>
                <input matInput type="color" [ngModel]="element.fabricConfig.fill"
                  (ngModelChange)="onChange('fill', $event)" class="h-8 p-0" />
              </mat-form-field>
            </div>

            <div class="flex items-center gap-2">
              <mat-form-field class="fuse-mat-dense flex-1" subscriptSizing="dynamic">
                <mat-label>Fuente</mat-label>
                <select matNativeControl [ngModel]="element.fabricConfig.fontFamily"
                  (ngModelChange)="onChange('fontFamily', $event)">
                  <option value="Arial">Arial</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Impact">Impact</option>
                </select>
              </mat-form-field>

              <button mat-icon-button [matTooltip]="'Negrita'"
                [class.text-blue-600]="element.fabricConfig.fontWeight === 'bold'"
                (click)="toggleBold()">
                <mat-icon class="icon-size-5" [svgIcon]="'heroicons_outline:bold'"></mat-icon>
              </button>
            </div>

            <div class="flex gap-1">
              @for (align of alignments; track align.value) {
                <button mat-icon-button [matTooltip]="align.label"
                  [class.text-blue-600]="element.fabricConfig.textAlign === align.value"
                  (click)="onChange('textAlign', align.value)">
                  <mat-icon class="icon-size-5">{{ align.icon }}</mat-icon>
                </button>
              }
            </div>
          }

          @if (isShape) {
            <div class="grid grid-cols-2 gap-2">
              <mat-form-field class="fuse-mat-dense" subscriptSizing="dynamic">
                <mat-label>Relleno</mat-label>
                <input matInput type="color" [ngModel]="element.fabricConfig.fill"
                  (ngModelChange)="onChange('fill', $event)" class="h-8 p-0" />
              </mat-form-field>

              <mat-form-field class="fuse-mat-dense" subscriptSizing="dynamic">
                <mat-label>Borde</mat-label>
                <input matInput type="color" [ngModel]="element.fabricConfig.stroke"
                  (ngModelChange)="onChange('stroke', $event)" class="h-8 p-0" />
              </mat-form-field>
            </div>

            <mat-form-field class="w-full fuse-mat-dense" subscriptSizing="dynamic">
              <mat-label>Opacidad</mat-label>
              <input matInput type="range" min="0" max="1" step="0.05"
                [ngModel]="element.fabricConfig.opacity ?? 1"
                (ngModelChange)="onChange('opacity', Number($event))" />
            </mat-form-field>
          }

          @if (!isText && !isShape && typeLabel) {
            <p class="text-sm text-gray-500">{{ typeLabel }} — propiedades limitadas</p>
          }

          <mat-divider></mat-divider>

          <div class="grid grid-cols-2 gap-2">
            <mat-form-field class="fuse-mat-dense" subscriptSizing="dynamic">
              <mat-label>X</mat-label>
              <input matInput type="number" [ngModel]="Math.round(element.fabricConfig.left ?? 0)"
                (ngModelChange)="onChange('left', Number($event))" />
            </mat-form-field>

            <mat-form-field class="fuse-mat-dense" subscriptSizing="dynamic">
              <mat-label>Y</mat-label>
              <input matInput type="number" [ngModel]="Math.round(element.fabricConfig.top ?? 0)"
                (ngModelChange)="onChange('top', Number($event))" />
            </mat-form-field>

            <mat-form-field class="fuse-mat-dense" subscriptSizing="dynamic">
              <mat-label>Ancho</mat-label>
              <input matInput type="number" [ngModel]="Math.round(element.fabricConfig.width ?? 0)"
                (ngModelChange)="onChange('width', Number($event))" />
            </mat-form-field>

            <mat-form-field class="fuse-mat-dense" subscriptSizing="dynamic">
              <mat-label>Alto</mat-label>
              <input matInput type="number" [ngModel]="Math.round(element.fabricConfig.height ?? 0)"
                (ngModelChange)="onChange('height', Number($event))" />
            </mat-form-field>
          </div>

          <app-custom-switch [checked]="element.fabricConfig.lockMovementX" (change)="toggleLock()"
            label="Bloquear posición"></app-custom-switch>

        </div>
      }
    </div>
  `,
  styles: [':host { display: block; }']
})
export class PropertiesPanelComponent {
  @Input() element: FlyerElement | null = null;
  @Output() propertyChange = new EventEmitter<{ key: string; value: any }>();

  protected Math = Math;

  alignments = [
    { value: 'left', label: 'Izquierda', icon: 'format_align_left' },
    { value: 'center', label: 'Centro', icon: 'format_align_center' },
    { value: 'right', label: 'Derecha', icon: 'format_align_right' },
  ];

  get isText(): boolean {
    return this.element?.type === 'text' || this.element?.type === 'price';
  }

  get isShape(): boolean {
    return this.element?.type === 'rectangle' || this.element?.type === 'circle';
  }

  get typeLabel(): string {
    const labels: Record<string, string> = {
      image: 'Imagen',
      line: 'Línea',
    };
    return this.element ? labels[this.element.type] || '' : '';
  }

  onChange(key: string, value: any) {
    this.propertyChange.emit({ key, value });
  }

  toggleBold() {
    const current = this.element?.fabricConfig?.fontWeight;
    this.onChange('fontWeight', current === 'bold' ? 'normal' : 'bold');
  }

  toggleLock() {
    const current = this.element?.fabricConfig?.lockMovementX;
    this.onChange('lockMovementX', !current);
    this.onChange('lockMovementY', !current);
  }
}
