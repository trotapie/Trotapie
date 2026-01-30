import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class ClearSessionGuard implements CanActivate {

  canActivate(): boolean {
    const lang = localStorage.getItem('lang');

    localStorage.clear();

    if (lang) {
      localStorage.setItem('lang', lang);
    }

    return true; // deja continuar la navegación
  }
}
