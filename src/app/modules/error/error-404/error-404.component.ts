import { CommonModule, Location } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    OnInit,
    signal,
    ViewEncapsulation,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { fuseAnimations } from '@fuse/animations';
import { AuthService } from 'app/core/auth/auth.service';

@Component({
    selector: 'app-error-404',
    standalone: true,
    templateUrl: './error-404.component.html',
    styleUrls: ['./error-404.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: fuseAnimations,
    imports: [
        CommonModule,
        RouterLink,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        TranslocoModule,
    ],
})
export class Error404Component implements OnInit {
    private readonly _router = inject(Router);
    private readonly _route = inject(ActivatedRoute);
    private readonly _location = inject(Location);
    private readonly _authService = inject(AuthService);

    // Signals para la vista reactiva
    readonly currentPath = signal<string>('');
    readonly isUserLoggedIn = signal<boolean>(false);

    readonly isCurrentPathInformative = computed(() => {
        const path = this.currentPath();
        return path && path !== '/' && path !== '/404' && path !== '/404-not-found';
    });

    readonly isAdminRouteAttempt = computed(() => {
        const path = this.currentPath().toLowerCase();
        return path.startsWith('/admin') || this.isUserLoggedIn();
    });

    readonly currentYear = new Date().getFullYear();

    ngOnInit(): void {
        // Detectar la ruta solicitada
        const attempted =
            this._router.url ||
            (typeof window !== 'undefined' ? window.location.pathname : '');
        this.currentPath.set(attempted);

        // Detectar si el usuario está autenticado
        try {
            this.isUserLoggedIn.set(this._authService.authenticated);
        } catch {
            this.isUserLoggedIn.set(false);
        }
    }

    /**
     * Regresar a la página anterior en el historial del navegador.
     * Si no existe historial previo dentro de la aplicación, redirigir a /inicio.
     */
    goBack(): void {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            this._location.back();
        } else {
            this._router.navigate(['/inicio']);
        }
    }
}
