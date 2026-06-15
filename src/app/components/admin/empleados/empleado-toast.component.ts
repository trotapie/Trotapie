import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';

type EmpleadoToastVariant = 'success' | 'warning';

interface EmpleadoToastData {
  title: string;
  message: string;
  variant: EmpleadoToastVariant;
}

@Component({
  selector: 'app-empleado-toast',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div
      class="flex min-w-[22rem] max-w-[24rem] items-start gap-4 rounded-2xl border bg-white p-4 shadow-2xl"
      [class.border-red-100]="data.variant === 'warning'"
      [class.border-emerald-100]="data.variant === 'success'">
      <div
        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
        [class.bg-red-50]="data.variant === 'warning'"
        [class.bg-emerald-50]="data.variant === 'success'">
        <mat-icon
          [class.text-red-600]="data.variant === 'warning'"
          [class.text-emerald-600]="data.variant === 'success'">
          {{ data.variant === 'warning' ? 'block' : 'check_circle' }}
        </mat-icon>
      </div>

      <div class="min-w-0 flex-1">
        <h3 class="text-base font-bold text-[#1e2124]">
          {{ data.title }}
        </h3>
        <p class="mt-1 text-sm leading-6 text-gray-600">
          {{ data.message }}
        </p>
      </div>

      <button mat-icon-button type="button" (click)="dismiss()" aria-label="Cerrar notificacion">
        <mat-icon class="text-gray-400">close</mat-icon>
      </button>
    </div>
  `,
})
export class EmpleadoToastComponent {
  constructor(
    private readonly _snackBarRef: MatSnackBarRef<EmpleadoToastComponent>,
    @Inject(MAT_SNACK_BAR_DATA) public data: EmpleadoToastData
  ) {}

  dismiss(): void {
    this._snackBarRef.dismiss();
  }
}
