import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { FuseNavigationItem } from '@fuse/components/navigation';
import { AuthService } from 'app/core/auth/auth.service';
import { Navigation } from 'app/core/navigation/navigation.types';
import { map, Observable, ReplaySubject, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NavigationService {
    private _httpClient = inject(HttpClient);
    private _authService = inject(AuthService);
    private _navigation: ReplaySubject<Navigation> =
        new ReplaySubject<Navigation>(1);

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Getter for navigation
     */
    get navigation$(): Observable<Navigation> {
        return this._navigation.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get all navigation data
     */
    get(): Observable<Navigation> {
        return this._httpClient.get<Navigation>('api/common/navigation').pipe(
            map((navigation) => this._filterNavigationByAccess(navigation)),
            tap((navigation) => {
                this._navigation.next(navigation);
            })
        );
    }

    private _filterNavigationByAccess(navigation: Navigation): Navigation {
        return {
            compact: this._filterNavigationItems(navigation.compact),
            default: this._filterNavigationItems(navigation.default),
            futuristic: this._filterNavigationItems(navigation.futuristic),
            horizontal: this._filterNavigationItems(navigation.horizontal),
        };
    }

    private _filterNavigationItems(items: FuseNavigationItem[] = []): FuseNavigationItem[] {
        return items
            .filter((item) => this._canShowNavigationItem(item))
            .map((item) => ({
                ...item,
                children: item.children
                    ? this._filterNavigationItems(item.children)
                    : item.children,
            }))
            .filter((item) => !item.children || item.children.length > 0 || item.type === 'basic');
    }

    private _canShowNavigationItem(item: FuseNavigationItem): boolean {
        const roles = item.meta?.roles as string[] | undefined;
        const permissions = item.meta?.permissions as string[] | undefined;

        if ((!roles || roles.length === 0) && (!permissions || permissions.length === 0)) {
            return true;
        }

        if (this._authService.isAdmin) {
            return true;
        }

        if (roles?.length && this._authService.hasAnyRole(roles)) {
            return true;
        }

        return Boolean(permissions?.length && this._authService.hasAnyPermission(permissions));
    }
}
