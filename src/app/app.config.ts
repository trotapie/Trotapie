import { provideHttpClient, withInterceptors, withJsonpSupport } from '@angular/common/http';
import {
    ApplicationConfig,
    inject,
    isDevMode,
    provideAppInitializer,
} from '@angular/core';
import { LuxonDateAdapter } from '@angular/material-luxon-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_DIALOG_DEFAULT_OPTIONS, MatDialogConfig } from '@angular/material/dialog';
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withInMemoryScrolling, withPreloading, PreloadAllModules } from '@angular/router';
import { provideFuse } from '@fuse';
import { TranslocoService, provideTransloco } from '@jsverse/transloco';
import { appRoutes } from 'app/app.routes';
import { provideAuth } from 'app/core/auth/auth.provider';
import { provideIcons } from 'app/core/icons/icons.provider';
import { MockApiService } from 'app/mock-api';
import { firstValueFrom } from 'rxjs';
import { provideServiceWorker } from '@angular/service-worker';
import { TranslocoHttpLoader } from './core/transloco/transloco.http-loader';
import { mockApiInterceptor } from '@fuse/lib/mock-api';
import { getDefaultLang } from './lang.utils';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { getSpanishPaginatorIntl } from './core/i18n/mat-paginator-es';

export const appConfig: ApplicationConfig = {
    providers: [
        provideAnimations(),
        provideHttpClient(
            withJsonpSupport(),
            withInterceptors([
                mockApiInterceptor,
                // fuseLoadingInterceptor,
            ])
        ),
        provideRouter(
            appRoutes,
            withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
            withPreloading(PreloadAllModules)
        ),

        // Material Date Adapter
        {
            provide: DateAdapter,
            useClass: LuxonDateAdapter,
        },
        {
            provide: MAT_DATE_LOCALE,
            useValue: 'es-MX'
        },
        {
            provide: MAT_DATE_FORMATS,
            useValue: {
                parse: {
                    dateInput: 'dd/MM/yyyy',
                },
                display: {
                    dateInput: 'dd/MM/yyyy',
                    monthYearLabel: 'MMM yyyy',
                    dateA11yLabel: 'dd/MM/yyyy',
                    monthYearA11yLabel: 'MMMM yyyy',
                },
            },
        },
        {
            provide: MatPaginatorIntl,
            useFactory: getSpanishPaginatorIntl,
        },
        {
            provide: MAT_DIALOG_DEFAULT_OPTIONS,
            useValue: {
                autoFocus: 'dialog',
                restoreFocus: true,
                enterAnimationDuration: '320ms',
                exitAnimationDuration: '220ms',
                panelClass: 'tp-motion-dialog-pane',
                backdropClass: 'tp-motion-dialog-backdrop',
            } as MatDialogConfig,
        },
        {
            provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
            useValue: {
                panelClass: 'tp-motion-snackbar',
            },
        },

        // Transloco Config
        provideTransloco({
            config: {
                availableLangs: [
                    { id: 'es', label: 'Español' },
                    { id: 'en', label: 'English' },
                    { id: 'fr', label: 'Français' },
                    { id: 'pt', label: 'Português' },
                    { id: 'de', label: 'Deutsch' }
                ],
                defaultLang: 'es',
                fallbackLang: 'es',
                reRenderOnLangChange: true,
                prodMode: !isDevMode(),
            },
            loader: TranslocoHttpLoader,
        }),
        provideAppInitializer(() => {
            const translocoService = inject(TranslocoService);

            const lang = getDefaultLang();

            translocoService.setActiveLang(lang);

            return firstValueFrom(translocoService.load(lang));
        }),

        // Fuse
        provideAuth(),
        provideIcons(),
        provideFuse({
            mockApi: {
                delay: 0,
                service: MockApiService,
            },
            fuse: {
                layout: 'material',
                scheme: 'light', // 'light' | 'dark' | 'auto'
                screens: {
                    sm: '600px',
                    md: '960px',
                    lg: '1280px',
                    xl: '1440px',
                },
                theme: 'theme-teal',
                themes: [
                    {
                        id: 'theme-default',
                        name: 'Default',
                    },
                    {
                        id: 'theme-brand',
                        name: 'Brand',
                    },
                    {
                        id: 'theme-teal',
                        name: 'Teal',
                    },
                    {
                        id: 'theme-rose',
                        name: 'Rose',
                    },
                    {
                        id: 'theme-purple',
                        name: 'Purple',
                    },
                    {
                        id: 'theme-amber',
                        name: 'Amber',
                    },
                ],
            },
        }),
        provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000',
        }),
    ],
};
