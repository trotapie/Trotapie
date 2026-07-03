import { Component, inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { FuseFullscreenComponent } from '@fuse/components/fullscreen';
import { FuseLoadingBarComponent } from '@fuse/components/loading-bar';
import {
    FuseHorizontalNavigationComponent,
    FuseNavigationService,
    FuseVerticalNavigationComponent,
} from '@fuse/components/navigation';
import { FuseConfig, FuseConfigService, Scheme } from '@fuse/services/config';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { NavigationService } from 'app/core/navigation/navigation.service';
import { Navigation } from 'app/core/navigation/navigation.types';
import { LanguagesComponent } from 'app/layout/common/languages/languages.component';
import { Subject, takeUntil } from 'rxjs';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
    selector: 'material-layout',
    templateUrl: './material.component.html',
    encapsulation: ViewEncapsulation.None,
    imports: [
        FuseLoadingBarComponent,
        FuseVerticalNavigationComponent,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        LanguagesComponent,
        // FuseFullscreenComponent,
        //FuseHorizontalNavigationComponent,
        RouterOutlet,
        TranslocoModule,
    ],
})
export class MaterialLayoutComponent implements OnInit, OnDestroy {
    private router = inject(Router);
    private _fuseConfigService = inject(FuseConfigService);

    isScreenSmall: boolean;
    navigation: Navigation;
    scheme: Scheme = 'light';
    resolvedScheme: 'dark' | 'light' = 'light';
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        private _activatedRoute: ActivatedRoute,
        private _navigationService: NavigationService,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _fuseNavigationService: FuseNavigationService
    ) { }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Getter for current year
     */
    get currentYear(): number {
        return new Date().getFullYear();
    }

    get isDarkScheme(): boolean {
        return this.resolvedScheme === 'dark';
    }

    get themeToggleLabel(): string {
        return this.isDarkScheme ? 'Activar modo claro' : 'Activar modo oscuro';
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // Subscribe to navigation data
        this._navigationService.navigation$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((navigation: Navigation) => {
                this.navigation = navigation;
            });

        this._fuseConfigService.config$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((config: FuseConfig) => {
                this.scheme = config.scheme;
                this.resolvedScheme = this._resolveScheme(config.scheme);
            });

        // Subscribe to media changes
        this._fuseMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({ matchingAliases }) => {
                // Check if the screen is small
                this.isScreenSmall = !matchingAliases.includes('md');
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Toggle navigation
     *
     * @param name
     */
    toggleNavigation(name: string): void {
        // Get the navigation
        const navigation =
            this._fuseNavigationService.getComponent<FuseVerticalNavigationComponent>(
                name
            );

        if (navigation) {
            // Toggle the opened status
            navigation.toggle();
        }
    }

    regresarInicio() {
        if (sessionStorage.length !== 0) {
            sessionStorage.clear();
        }

        if (this.router.url === '/inicio') {
            window.location.reload();
        } else {
            this.router.navigate(['/inicio']);
        }
    }

    toggleScheme(): void {
        const nextScheme: Scheme = this.resolvedScheme === 'dark' ? 'light' : 'dark';

        this._fuseConfigService.config = { scheme: nextScheme };
    }

    private _resolveScheme(scheme: Scheme): 'dark' | 'light' {
        if (scheme !== 'auto') {
            return scheme;
        }

        return window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
    }

}
