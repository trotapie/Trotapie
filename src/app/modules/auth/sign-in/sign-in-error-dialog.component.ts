import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

interface SignInErrorDialogData {
    title?: string;
    message?: string;
}

@Component({
    selector: 'auth-sign-in-error-dialog',
    standalone: true,
    imports: [MatDialogModule, MatButtonModule, MatIconModule],
    template: `
        <div>
            <div class="mb-4 flex items-start gap-4">
                <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-50">
                    <mat-icon class="text-red-600">error_outline</mat-icon>
                </div>
                <div>
                    <h2 class="text-xl font-bold text-[#1e2124]">
                        {{ data?.title || 'No se pudo iniciar sesion' }}
                    </h2>
                    <p class="mt-2 text-sm leading-6 text-gray-600">
                        {{ data?.message || 'Usuario y/o contrasena incorrectos.' }}
                    </p>
                </div>
            </div>

            <div class="flex justify-end">
                <button mat-raised-button class="text-white" color="primary" type="button" (click)="close()">
                    Entendido
                </button>
            </div>
        </div>
    `,
})
export class AuthSignInErrorDialogComponent {
    constructor(
        private _dialogRef: MatDialogRef<AuthSignInErrorDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: SignInErrorDialogData | null
    ) {}

    close(): void {
        this._dialogRef.close();
    }
}
