import {
    EnvironmentProviders,
    Provider,
    inject,
    provideEnvironmentInitializer,
} from '@angular/core';
import { AuthService } from 'app/core/auth/auth.service';
import { InactivitySessionService } from 'app/core/auth/inactivity-session.service';

export const provideAuth = (): Array<Provider | EnvironmentProviders> => {
    return [
        provideEnvironmentInitializer(() => {
            inject(AuthService);
            inject(InactivitySessionService).initialize();
        }),
    ];
};
