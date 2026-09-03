import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

declare global {
    interface Window {
        gtag?: (command: string, ...args: unknown[]) => void;
    }
}

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    imports: [RouterOutlet],
})
export class AppComponent {
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    constructor() {
        this.router.events
            .pipe(
                filter(
                    (event): event is NavigationEnd =>
                        event instanceof NavigationEnd,
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((event) => {
                if (typeof window === 'undefined') {
                    return;
                }

                window.gtag?.('event', 'page_view', {
                    page_path: event.urlAfterRedirects,
                    page_location: window.location.href,
                    page_title: document.title,
                });
            });
    }
}
