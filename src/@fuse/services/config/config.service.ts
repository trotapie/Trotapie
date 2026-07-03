import { inject, Injectable } from '@angular/core';
import { FUSE_CONFIG } from '@fuse/services/config/config.constants';
import { merge } from 'lodash-es';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FuseConfigService {
    private readonly _storageKey = 'trotapie:fuse-config';
    private readonly _defaultConfig = inject(FUSE_CONFIG);
    private _config = new BehaviorSubject(this._hydrateConfig());

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Setter & getter for config
     */
    set config(value: any) {
        // Merge the new config over to the current config
        const config = merge({}, this._config.getValue(), value);

        this._persistConfig(config);

        // Execute the observable
        this._config.next(config);
    }

    // eslint-disable-next-line @typescript-eslint/member-ordering
    get config$(): Observable<any> {
        return this._config.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Resets the config to the default
     */
    reset(): void {
        // Set the config
        this._persistConfig(this._defaultConfig);
        this._config.next(this._defaultConfig);
    }

    private _hydrateConfig(): any {
        if (typeof localStorage === 'undefined') {
            return this._defaultConfig;
        }

        try {
            const savedConfig = localStorage.getItem(this._storageKey);

            if (!savedConfig) {
                return this._defaultConfig;
            }

            return merge({}, this._defaultConfig, JSON.parse(savedConfig));
        } catch {
            return this._defaultConfig;
        }
    }

    private _persistConfig(config: any): void {
        if (typeof localStorage === 'undefined') {
            return;
        }

        try {
            const persistedConfig = {
                scheme: config?.scheme,
                theme: config?.theme,
            };

            localStorage.setItem(this._storageKey, JSON.stringify(persistedConfig));
        } catch {
            // Ignore storage failures so theme changes never block UI updates.
        }
    }
}
