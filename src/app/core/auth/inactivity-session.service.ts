import { DOCUMENT } from '@angular/common';
import { Injectable, Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';
import { FuseConfirmationService } from '@fuse/services/confirmation';

@Injectable({ providedIn: 'root' })
export class InactivitySessionService {
    // Change this value to 30 * 60_000 when the trial period is complete.
    private readonly _inactivityLimit = 30 * 60_000;
    private readonly _document = inject(DOCUMENT);
    private readonly _injector = inject(Injector);
    private readonly _confirmationService = inject(FuseConfirmationService);
    private _timerId: ReturnType<typeof setTimeout> | null = null;
    private _monitoring = false;

    initialize(): void {
        for (const eventName of ['pointerdown', 'keydown', 'touchstart', 'scroll']) {
            this._document.addEventListener(eventName, this._registerActivity, { passive: true });
        }
    }

    start(): void {
        this._monitoring = true;
        this._resetTimer();
    }

    stop(): void {
        this._monitoring = false;
        this._clearTimer();
    }

    private _registerActivity = (): void => {
        if (this._monitoring) {
            this._resetTimer();
        }
    };

    private _resetTimer(): void {
        this._clearTimer();
        this._timerId = setTimeout(() => this._expireSession(), this._inactivityLimit);
    }

    private _clearTimer(): void {
        if (this._timerId !== null) {
            clearTimeout(this._timerId);
            this._timerId = null;
        }
    }

    private _expireSession(): void {
        if (!this._monitoring) {
            return;
        }

        this.stop();
        const authService = this._injector.get(AuthService);
        const router = this._injector.get(Router);

        const dialogRef = this._confirmationService.open({
            title: 'Tu sesion ha expirado',
            message: 'Por seguridad, debes iniciar sesion nuevamente.',
            icon: {
                show: true,
                name: 'heroicons_outline:clock',
                color: 'warning',
            },
            actions: {
                confirm: {
                    show: true,
                    label: 'Aceptar',
                    color: 'primary',
                },
                cancel: {
                    show: false,
                },
            },
            dismissible: false,
        });

        dialogRef.afterClosed().subscribe(() => {
            authService.signOut().subscribe(() => {
                void router.navigate(['/sign-in'], { replaceUrl: true });
            });
        });
    }
}
