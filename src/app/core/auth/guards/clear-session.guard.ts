import { Injectable, inject } from '@angular/core';
import { CanActivate } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ClearSessionGuard implements CanActivate {
  private readonly authService = inject(AuthService);

  canActivate(): Observable<boolean> {
    return this.authService.signOut().pipe(map(() => true));
  }
}
