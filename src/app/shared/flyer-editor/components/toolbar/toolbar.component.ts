import { Component, EventEmitter, Output } from '@angular/core';
import { MaterialModule } from 'app/shared/material.module';

@Component({
  selector: 'app-flyer-toolbar',
  standalone: true,
  imports: [MaterialModule],
  template: `
    <div class="space-y-1">
      <p class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Elementos</p>

      <button mat-stroked-button class="w-full justify-start text-sm" (click)="addText.emit()">
        <mat-icon class="icon-size-4 mr-2" [svgIcon]="'heroicons_outline:font-italic'"></mat-icon>
        Texto
      </button>

      <button mat-stroked-button class="w-full justify-start text-sm" (click)="addImage.emit()">
        <mat-icon class="icon-size-4 mr-2" [svgIcon]="'heroicons_outline:photo'"></mat-icon>
        Imagen
      </button>

      <button mat-stroked-button class="w-full justify-start text-sm" (click)="addRect.emit()">
        <mat-icon class="icon-size-4 mr-2" [svgIcon]="'heroicons_outline:rectangle-stack'"></mat-icon>
        Rectángulo
      </button>

      <button mat-stroked-button class="w-full justify-start text-sm" (click)="addCircle.emit()">
        <mat-icon class="icon-size-4 mr-2" [svgIcon]="'heroicons_outline:circle-stack'"></mat-icon>
        Círculo
      </button>

      <button mat-stroked-button class="w-full justify-start text-sm" (click)="addLine.emit()">
        <mat-icon class="icon-size-4 mr-2">horizontal_rule</mat-icon>
        Línea
      </button>

      <button mat-stroked-button class="w-full justify-start text-sm" (click)="addPrice.emit()">
        <mat-icon class="icon-size-4 mr-2" [svgIcon]="'heroicons_outline:currency-dollar'"></mat-icon>
        Precio
      </button>

      <mat-divider class="my-3"></mat-divider>

      <p class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Acciones</p>

      <button mat-stroked-button class="w-full justify-start text-sm" (click)="deleteSelected.emit()"
        [color]="'warn'">
        <mat-icon class="icon-size-4 mr-2" [svgIcon]="'heroicons_outline:trash'"></mat-icon>
        Eliminar
      </button>

      <button mat-stroked-button class="w-full justify-start text-sm" (click)="duplicateSelected.emit()">
        <mat-icon class="icon-size-4 mr-2" [svgIcon]="'heroicons_outline:document-duplicate'"></mat-icon>
        Duplicar
      </button>
    </div>
  `,
  styles: [':host { display: block; }']
})
export class ToolbarComponent {
  @Output() addText = new EventEmitter<void>();
  @Output() addImage = new EventEmitter<void>();
  @Output() addRect = new EventEmitter<void>();
  @Output() addCircle = new EventEmitter<void>();
  @Output() addLine = new EventEmitter<void>();
  @Output() addPrice = new EventEmitter<void>();
  @Output() deleteSelected = new EventEmitter<void>();
  @Output() duplicateSelected = new EventEmitter<void>();
}
