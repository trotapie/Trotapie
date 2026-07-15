import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class ClearSessionGuard implements CanActivate {
  canActivate(): boolean {
    // Public navigation must not delete the persisted Supabase session or UI settings.
    return true;
  }
}
