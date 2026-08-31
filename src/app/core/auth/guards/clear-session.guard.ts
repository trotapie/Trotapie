import { Injectable, inject } from '@angular/core';
import { CanActivate } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class ClearSessionGuard implements CanActivate {
  private readonly authService = inject(AuthService);

  canActivate(): boolean {
    this.authService.clearSessionForPublicRoute();
    return true;
  }
}
