import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MaterialModule } from 'app/shared/material.module';
import { FlyerTemplate } from '../../models/flyer-template.interface';

@Component({
  selector: 'app-flyer-template-gallery',
  standalone: true,
  imports: [MaterialModule],
  template: `
    @if (open) {
      <div class="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 px-4">
        <div class="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-auto">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="text-xl font-semibold text-gray-900">Plantillas</h3>
              <p class="text-sm text-gray-500">Selecciona una plantilla para empezar</p>
            </div>
            <button mat-icon-button (click)="close.emit()">
              <mat-icon [svgIcon]="'heroicons_outline:x-mark'"></mat-icon>
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (template of templates; track template.id) {
              <div class="rounded-xl border border-gray-200 overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:border-blue-300"
                [class.ring-2]="selectedId === template.id"
                [class.ring-blue-500]="selectedId === template.id"
                (click)="select.emit(template)">

                <div class="bg-gray-100 flex items-center justify-center overflow-hidden"
                  [style.aspect-ratio]="template.orientacion === 'portrait' ? '9 / 16' : '16 / 9'">
                  @if (template.thumbnail) {
                    <img [src]="template.thumbnail" [alt]="template.nombre" class="w-full h-full object-cover" />
                  } @else {
                    <div class="text-center p-4">
                      <mat-icon class="icon-size-12 text-gray-300" [svgIcon]="'heroicons_outline:photo'"></mat-icon>
                      <p class="text-xs text-gray-400 mt-2">{{ template.orientacion === 'portrait' ? '1080×1920' : '1920×1080' }}</p>
                    </div>
                  }
                </div>

                <div class="p-3">
                  <h4 class="font-semibold text-sm text-gray-900">{{ template.nombre }}</h4>
                  <p class="text-xs text-gray-500 mt-1">{{ template.descripcion }}</p>
                  <div class="flex items-center gap-2 mt-2">
                    <span class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {{ template.categoria }}
                    </span>
                    <span class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {{ template.orientacion === 'portrait' ? 'Vertical' : 'Horizontal' }}
                    </span>
                  </div>
                </div>
              </div>
            }
          </div>

          @if (!templates.length) {
            <div class="text-center py-12">
              <mat-icon class="icon-size-16 text-gray-200" [svgIcon]="'heroicons_outline:rectangle-stack'"></mat-icon>
              <p class="text-gray-500 mt-2">No hay plantillas disponibles</p>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [':host { display: contents; }']
})
export class TemplateGalleryComponent {
  @Input() open = false;
  @Input() templates: FlyerTemplate[] = [];
  @Input() selectedId: number | null = null;
  @Output() select = new EventEmitter<FlyerTemplate>();
  @Output() close = new EventEmitter<void>();
}
