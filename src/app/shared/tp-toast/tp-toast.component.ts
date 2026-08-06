import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';

export type TpToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface TpToastData {
  title: string;
  message: string;
  variant: TpToastVariant;
  duration?: number;
}

@Component({
  selector: 'app-tp-toast',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="tp-toast" [class]="'tp-toast tp-toast--' + data.variant" [style.--tp-toast-duration]="(data.duration ?? 3500) + 'ms'" role="status">
      <div class="tp-toast__icon" aria-hidden="true">
        <mat-icon>{{ icono }}</mat-icon>
      </div>
      <div class="tp-toast__copy">
        <h3>{{ data.title }}</h3>
        <p>{{ data.message }}</p>
      </div>
      <button mat-icon-button type="button" class="tp-toast__close" aria-label="Cerrar notificación" (click)="dismiss()">
        <mat-icon>close</mat-icon>
      </button>
      <div class="tp-toast__progress" aria-hidden="true"></div>
    </div>
  `,
  styles: [`
    :host { display: block; width: min(25rem, calc(100vw - 2rem)); }
    .tp-toast { position: relative; display: flex; align-items: flex-start; gap: .8rem; overflow: hidden; padding: .95rem .85rem 1.15rem 1rem; color: #fff; border: 1px solid rgba(255, 255, 255, .16); border-radius: 1rem; box-shadow: 0 12px 35px rgba(34, 197, 94, .35); }
    .tp-toast__icon { display: grid; flex: 0 0 auto; width: 2.7rem; height: 2.7rem; place-items: center; color: #fff; border: 1px solid rgba(255, 255, 255, .18); border-radius: 50%; background: rgba(255, 255, 255, .15); }
    .tp-toast__icon mat-icon { width: 1.4rem; height: 1.4rem; color: #fff; font-size: 1.4rem; font-variation-settings: 'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 24; }
    .tp-toast__copy { min-width: 0; padding: .1rem 0; }
    .tp-toast__copy h3 { margin: 0; color: #fff; font-size: .92rem; font-weight: 800; line-height: 1.25; }
    .tp-toast__copy p { margin: .25rem 0 0; color: rgba(255, 255, 255, .84); font-size: .78rem; line-height: 1.4; }
    .tp-toast__close { flex: 0 0 auto; width: 2rem; height: 2rem; margin: -.25rem -.2rem 0 0; color: #fff; }
    .tp-toast__close mat-icon { color: #fff; font-variation-settings: 'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 24; }
    .tp-toast__close:hover { background: rgba(255, 255, 255, .14); }
    .tp-toast__progress { position: absolute; right: 0; bottom: 0; left: 0; height: .25rem; overflow: hidden; }
    .tp-toast__progress::after { display: block; width: 100%; height: 100%; content: ''; background: #7ed49e; transform: scaleX(0); transform-origin: left; animation: tp-toast-fill var(--tp-toast-duration) linear forwards; }
    .tp-toast--success { background: linear-gradient(135deg, #166534, #15803d 52%, #16a34a); }
    .tp-toast--warning { background: linear-gradient(135deg, #b8831c, #d5a33a 52%, #e4bd68); }
    .tp-toast--error { background: linear-gradient(135deg, #991b1b, #b91c1c 52%, #dc2626); }
    .tp-toast--info { background: linear-gradient(135deg, #1d4f7a, #256a9c 52%, #3386bd); }
    .tp-toast--warning .tp-toast__progress::after { background: #f3d58a; }
    .tp-toast--error .tp-toast__progress::after { background: #f38b8b; }
    .tp-toast--info .tp-toast__progress::after { background: #9ac7e5; }
    @keyframes tp-toast-fill { to { transform: scaleX(1); } }
  `]
})
export class TpToastComponent {
  constructor(
    private readonly snackBarRef: MatSnackBarRef<TpToastComponent>,
    @Inject(MAT_SNACK_BAR_DATA) readonly data: TpToastData
  ) {}

  get icono(): string {
    return { success: 'check_circle', error: 'error', warning: 'warning_amber', info: 'info' }[this.data.variant];
  }

  dismiss(): void {
    this.snackBarRef.dismiss();
  }
}
