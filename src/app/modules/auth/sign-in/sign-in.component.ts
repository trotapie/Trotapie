import { Component, inject, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import {
    FormsModule,
    NgForm,
    ReactiveFormsModule,
    UntypedFormBuilder,
    UntypedFormGroup,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { FuseAlertComponent, FuseAlertType } from '@fuse/components/alert';
import { AuthService } from 'app/core/auth/auth.service';
import { SupabaseService } from 'app/core/supabase.service';
import { AuthSignInErrorDialogComponent } from './sign-in-error-dialog.component';

@Component({
    selector: 'auth-sign-in',
    templateUrl: './sign-in.component.html',
    encapsulation: ViewEncapsulation.None,
    animations: fuseAnimations,
    imports: [
        RouterLink,
        // FuseAlertComponent,
        FormsModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatCheckboxModule,
        MatProgressSpinnerModule,
    ],
})
export class AuthSignInComponent implements OnInit {
    private supabase = inject(SupabaseService);

    private _authenticated: boolean = false;


    set accessToken(token: string) {
        localStorage.setItem('accessToken', token);
    }

    get accessToken(): string {
        return localStorage.getItem('accessToken') ?? '';
    }

    @ViewChild('signInNgForm') signInNgForm: NgForm;

    alert: { type: FuseAlertType; message: string } = {
        type: 'success',
        message: '',
    };
    signInForm: UntypedFormGroup;
    showAlert: boolean = false;

    get currentYear(): number {
        return new Date().getFullYear();
    }

    /**
     * Constructor
     */
    constructor(
        private _activatedRoute: ActivatedRoute,
        private _authService: AuthService,
        private _formBuilder: UntypedFormBuilder,
        private _router: Router,
        private _dialog: MatDialog
    ) { }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // Create the form
        this.signInForm = this._formBuilder.group({
            email: [
                '',
                [Validators.required, Validators.email],
            ],
            password: ['', Validators.required],
            rememberMe: [''],
        });
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Sign in
     */
    // async signIn() {
    //     // Return if the form is invalid
    //     if (this.signInForm.invalid) {
    //         return;
    //     }

    //     this.signInForm.disable();

    //     this.showAlert = false;

    //     const { data, error } = await this.supabase.signIn(this.signInForm.get('email').value, this.signInForm.get('password').value);

    //     if (data) {
    //         console.log('si entra');
    //         this.accessToken = data.session.access_token;

    //         // Set the authenticated flag to true
    //         this._authenticated = true;

    //         // Store the user on the user service
    //         // this._userService.user = response.user;
    //         const redirectURL =
    //             this._activatedRoute.snapshot.queryParamMap.get(
    //                 'redirectURL'
    //             ) || '/signed-in-redirect';

    //         // Navigate to the redirect url
    //         this._router.navigateByUrl(redirectURL);
    //     }

    //     if (error) {
    //         this.alert = {
    //             type: 'error',
    //             message: 'Wrong email or password',
    //         };
    //         this.showAlert = true;
    //     }
    // }

    async signIn() {
        if (this.signInForm.invalid) return;

        this.signInForm.disable();
        this.showAlert = false;

        this._authService.signIn({
            email: this.signInForm.get('email')?.value,
            password: this.signInForm.get('password')?.value,
        }).subscribe({
            next: (response) => {
                if (response?.user?.requiresPasswordChange) {
                    this._router.navigateByUrl('/first-login-password');
                    return;
                }

                const redirectURL =
                    this._activatedRoute.snapshot.queryParamMap.get('redirectURL') ||
                    '/signed-in-redirect';

                const targetURL =
                    response?.user?.role === 'cotizador'
                        ? '/admin/solicitudes-cotizacion'
                        : redirectURL.startsWith('/admin') &&
                          response?.user?.role !== 'admin' &&
                          !response?.user?.permissions?.length
                            ? '/admin/solicitudes-cotizacion'
                            : redirectURL;

                this._router.navigateByUrl(targetURL);
            },
            error: (error) => {
                this.signInForm.enable();
                const rawMessage = String(error?.message ?? '').trim();
                const isInactiveUser = rawMessage.toLowerCase().includes('inactivo');
                const isUnlinkedUser = rawMessage.toLowerCase().includes('empleado activo asociado');
                const dialogTitle = isInactiveUser
                    ? 'Usuario inactivo'
                    : isUnlinkedUser
                        ? 'Usuario sin empleado'
                        : 'Credenciales incorrectas';
                const dialogMessage = rawMessage || 'Usuario y/o contrasena incorrectos.';

                this.alert = { type: 'error', message: dialogMessage };
                this.showAlert = true;
                this._dialog.open(AuthSignInErrorDialogComponent, {
                    width: '420px',
                    disableClose: false,
                    data: {
                        title: dialogTitle,
                        message: dialogMessage,
                    },
                });
            },
        });
    }


}
