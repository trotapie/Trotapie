import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TpToastComponent, TpToastData } from './tp-toast.component';

@Injectable({ providedIn: 'root' })
export class TpToastService {
  private readonly snackBar = inject(MatSnackBar);

  show(data: TpToastData, duration = 3500): void {
    this.snackBar.openFromComponent(TpToastComponent, {
      data: { ...data, duration },
      duration,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['tp-snackbar']
    });
  }
}
