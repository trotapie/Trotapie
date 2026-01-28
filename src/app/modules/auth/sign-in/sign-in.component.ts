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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { FuseAlertComponent, FuseAlertType } from '@fuse/components/alert';
import { AuthService } from 'app/core/auth/auth.service';
import { SupabaseService } from 'app/core/supabase.service';

@Component({
    selector: 'auth-sign-in',
    templateUrl: './sign-in.component.html',
    encapsulation: ViewEncapsulation.None,
    animations: fuseAnimations,
    imports: [
        RouterLink,
        FuseAlertComponent,
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

    /**
     * Constructor
     */
    constructor(
        private _activatedRoute: ActivatedRoute,
        private _authService: AuthService,
        private _formBuilder: UntypedFormBuilder,
        private _router: Router
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
                'pruebausuarios@gmail.com',
                [Validators.required, Validators.email],
            ],
            password: ['12345', Validators.required],
            rememberMe: [''],
        });
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Sign in
     */
    async signIn() {
        // Return if the form is invalid
        if (this.signInForm.invalid) {
            return;
        }

        // Disable the form
        this.signInForm.disable();

        // Hide the alert
        this.showAlert = false;

        // Sign in
        // this._authService.signIn(this.signInForm.value).subscribe(
        //     () => {
        //         // Set the redirect url.
        //         // The '/signed-in-redirect' is a dummy url to catch the request and redirect the user
        //         // to the correct page after a successful sign in. This way, that url can be set via
        //         // routing file and we don't have to touch here.
        //         const redirectURL =
        //             this._activatedRoute.snapshot.queryParamMap.get(
        //                 'redirectURL'
        //             ) || '/signed-in-redirect';

        //         // Navigate to the redirect url
        //         this._router.navigateByUrl(redirectURL);
        //     },
        //     (response) => {
        //         // Re-enable the form
        //         this.signInForm.enable();

        //         // Reset the form
        //         this.signInNgForm.resetForm();

        //         // Set the alert
        //         this.alert = {
        //             type: 'error',
        //             message: 'Wrong email or password',
        //         };

        //         // Show the alert
        //         this.showAlert = true;
        //     }
        // );
        const { data, error } = await this.supabase.signIn(this.signInForm.get('email').value, this.signInForm.get('password').value);

        if (data) {
            console.log('si entra');
            this.accessToken = data.session.access_token;

            // Set the authenticated flag to true
            this._authenticated = true;

            // Store the user on the user service
            // this._userService.user = response.user;
            const redirectURL =
                this._activatedRoute.snapshot.queryParamMap.get(
                    'redirectURL'
                ) || '/signed-in-redirect';

            // Navigate to the redirect url
            this._router.navigateByUrl(redirectURL);
        }

        if (error) {
            this.alert = {
                type: 'error',
                message: 'Wrong email or password',
            };
            this.showAlert = true;
        }
    }
}
