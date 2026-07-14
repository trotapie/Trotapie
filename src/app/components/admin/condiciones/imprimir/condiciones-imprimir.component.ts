import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialModule } from 'app/shared/material.module';

@Component({
  selector: 'app-condiciones-imprimir',
  standalone: true,
  imports: [MaterialModule, RouterLink],
  template: `
    <div class="flex min-h-[calc(100vh-8rem)] flex-col bg-gray-50 px-6 py-8 dark:bg-gray-950 sm:px-8">
      <div class="mx-auto w-full max-w-screen-xl">
        <a [routerLink]="['/admin/condiciones']" class="mb-6 inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
          <mat-icon class="icon-size-4" svgIcon="heroicons_outline:arrow-left"></mat-icon>
          Volver a Condiciones
        </a>

        <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Imprimir</h1>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Aqui ira el selector de plantilla, el formulario dinamico y la vista previa del PDF.</p>
        </section>
      </div>
    </div>
  `,
})
export class CondicionesImprimirComponent {}
