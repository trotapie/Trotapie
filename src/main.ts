import { registerLocaleData } from '@angular/common';

import localeEs from '@angular/common/locales/es';
import localeEn from '@angular/common/locales/en';
import localePt from '@angular/common/locales/pt';
import localeFr from '@angular/common/locales/fr';
import localeDe from '@angular/common/locales/de';

registerLocaleData(localeEs);
registerLocaleData(localeEn);
registerLocaleData(localePt);
registerLocaleData(localeFr);
registerLocaleData(localeDe);

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from 'app/app.component';
import { appConfig } from 'app/app.config';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { inject } from '@vercel/analytics';

const unlockAppScroll = (): void => {
  if (typeof document === 'undefined') {
    return;
  }

  document.body.classList.add('app-skeleton-hidden');
};

const wireAppSkeleton = (): (() => void) => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return () => undefined;
  }

  const skeleton = document.getElementById('app-skeleton');

  if (!skeleton) {
    unlockAppScroll();
    return () => undefined;
  }

  let unlocked = false;

  const releaseScroll = (): void => {
    if (unlocked) {
      return;
    }

    unlocked = true;
    unlockAppScroll();
  };

  // Keep a safety net for a failed bootstrap, but do not hide the app before
  // Angular has mounted the router outlet.
  window.setTimeout(releaseScroll, 10_000);

  return releaseScroll;
};

const releaseSkeleton = wireAppSkeleton();

if (typeof window !== 'undefined') {
  injectSpeedInsights();
  inject();
}

bootstrapApplication(AppComponent, appConfig)
  .then(() => releaseSkeleton())
  .catch((err) => {
    releaseSkeleton();
    console.error('No se pudo iniciar la aplicacion.', err);
  });
