import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class ClearSessionGuard implements CanActivate {
  private readonly botPrefillStorageKey = 'trotapie_bot_prefill_cliente';

  canActivate(): boolean {
    const lang = localStorage.getItem('lang');
    const botPrefill = localStorage.getItem(this.botPrefillStorageKey);

    localStorage.clear();

    if (lang) {
      localStorage.setItem('lang', lang);
    }

    if (botPrefill) {
      localStorage.setItem(this.botPrefillStorageKey, botPrefill);
    }

    return true; // deja continuar la navegación
  }
}
