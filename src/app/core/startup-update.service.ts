import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

@Injectable({ providedIn: 'root' })
export class StartupUpdateService {
    private readonly updates = inject(SwUpdate);
    private readonly readyState = signal(false);
    readonly ready = this.readyState.asReadonly();

    constructor() {
        void this.checkAtStartup();
    }

    private async checkAtStartup(): Promise<void> {
        if (!this.updates.isEnabled || typeof window === 'undefined') {
            this.readyState.set(true);
            return;
        }

        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
            // Only this startup window can trigger a reload. A download that
            // finishes later must never interrupt a form or another active task.
            const updated = await Promise.race([
                this.updates.checkForUpdate(),
                new Promise<boolean>((resolve) => {
                    timeout = setTimeout(() => resolve(false), 2000);
                }),
            ]);

            if (updated) {
                // Prevent reload loops if a deployment or browser cache is broken.
                const key = 'trotapie-startup-update-reload';
                const previousReload = Number(sessionStorage.getItem(key) ?? 0);
                if (Date.now() - previousReload > 60000) {
                    sessionStorage.setItem(key, String(Date.now()));
                    window.location.reload();
                    return;
                }
            }
        } catch {
            // Offline, unavailable storage or update errors must not block entry.
        } finally {
            if (timeout !== undefined) clearTimeout(timeout);
            this.readyState.set(true);
        }
    }
}
