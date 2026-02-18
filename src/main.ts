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

if (typeof window !== 'undefined') {
  injectSpeedInsights();
}

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
