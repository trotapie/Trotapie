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

const unlockAppScroll = (): void => {
  if (typeof document === 'undefined') {
    return;
  }

  document.body.classList.add('app-skeleton-hidden');
};

const wireAppSkeleton = (): void => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  const skeleton = document.getElementById('app-skeleton');

  if (!skeleton) {
    unlockAppScroll();
    return;
  }

  let unlocked = false;

  const releaseScroll = (): void => {
    if (unlocked) {
      return;
    }

    unlocked = true;
    unlockAppScroll();
    skeleton.removeEventListener('animationend', handleAnimationEnd);
  };

  const handleAnimationEnd = (event: AnimationEvent): void => {
    if (event.target !== skeleton) {
      return;
    }

    releaseScroll();
  };

  skeleton.addEventListener('animationend', handleAnimationEnd);
  window.setTimeout(releaseScroll, 3500);
};

if (typeof window !== 'undefined') {
  injectSpeedInsights();
  wireAppSkeleton();
}

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
