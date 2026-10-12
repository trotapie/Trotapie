import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DetalleDestinoComponent } from 'app/components/inicio/detalle-destino/detalle-destino.component';
import { MaterialModule } from 'app/shared/material.module';

@Component({
  selector: 'app-vista-previa-destino',
  imports: [DetalleDestinoComponent, MaterialModule],
  host: { class: 'flex min-w-0 min-h-0 flex-auto flex-col' },
  template: `
    <header class="flex flex-col gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div>
        <h1 class="text-lg font-semibold text-gray-900 dark:text-white">Vista previa pública del destino</h1>
        <!-- <p class="text-sm text-gray-500 dark:text-gray-400">Contenido guardado, con el mismo diseño de la ficha pública.</p> -->
      </div>
      <button mat-stroked-button type="button" (click)="regresar()" class="shrink-0">
        <mat-icon class="mr-2 icon-size-5">arrow_back</mat-icon>
        Volver a editar
      </button>
    </header>
    <div class="preview-surface relative min-w-0 flex-1 overflow-hidden">
      <app-detalle-destino />
    </div>
  `,
  styles: `
    :host {
      height: calc(100dvh - 4rem);
      overflow: hidden;
    }

    .preview-surface {
      min-height: 0;
      /* Contain fixed public controls below the admin header. */
      transform: translateZ(0);
    }

    app-detalle-destino {
      position: absolute;
      inset: 0;
      display: block;
      overflow-y: auto;
    }
  `
})
export class VistaPreviaDestinoComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  regresar(): void {
    void this.router.navigate(['..'], { relativeTo: this.route, queryParams: this.route.snapshot.queryParams });
  }
}
