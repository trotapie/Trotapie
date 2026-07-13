import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import {
    FormsModule,
    NgForm,
    ReactiveFormsModule,
    UntypedFormBuilder,
    UntypedFormGroup,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { FuseAlertComponent, FuseAlertType } from '@fuse/components/alert';
import { FuseValidators } from '@fuse/validators';
import { AuthService } from 'app/core/auth/auth.service';
import { finalize } from 'rxjs';

@Component({
    selector: 'auth-first-login-password',
    templateUrl: './first-login-password.component.html',
    encapsulation: ViewEncapsulation.None,
    animations: fuseAnimations,
    imports: [
        FuseAlertComponent,
        FormsModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
    ],
})
export class AuthFirstLoginPasswordComponent implements OnInit {
    @ViewChild('firstLoginPasswordNgForm') firstLoginPasswordNgForm: NgForm;

    alert: { type: FuseAlertType; message: string } = {
        type: 'success',
        message: '',
    };
    form: UntypedFormGroup;
    showAlert = false;

    constructor(
        private _authService: AuthService,
        private _formBuilder: UntypedFormBuilder,
        private _router: Router,
    ) {}

    ngOnInit(): void {
        this.form = this._formBuilder.group(
            {
                password: ['', [Validators.required, Validators.minLength(6)]],
                passwordConfirm: ['', Validators.required],
            },
            {
                validators: FuseValidators.mustMatch('password', 'passwordConfirm'),
            }
        );
    }

    changePassword(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.form.disable();
        this.showAlert = false;
        this._authService
            .completeFirstLoginPassword(this.form.get('password')?.value)
            .pipe(
                finalize(() => {
                    this.form.enable();
                })
            )
            .subscribe({
                next: () => {
                    const redirectURL = this._router.parseUrl('/admin/solicitudes-cotizacion');
                    void this._router.navigateByUrl(redirectURL);
                },
                error: (error) => {
                    const rawMessage = String(error?.message ?? '').trim();
                    const message = rawMessage.includes('non-2xx')
                        ? 'No se pudo confirmar el primer ingreso. Intenta de nuevo o pide al administrador actualizar la funcion de acceso.'
                        : rawMessage || 'No se pudo actualizar la contrasena.';

                    this.alert = {
                        type: 'error',
                        message,
                    };
                    this.showAlert = true;
                },
            });
    }

    changePasswordLater(): void {
        this.showAlert = false;
        this.form.disable();

        this._authService
            .signOut()
            .pipe(
                finalize(() => {
                    this.form.enable();
                })
            )
            .subscribe({
                next: () => {
                    void this._router.navigate(['/sign-in']);
                },
                error: () => {
                    void this._router.navigate(['/sign-in']);
                },
            });
    }
}
