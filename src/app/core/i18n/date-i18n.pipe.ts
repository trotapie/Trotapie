import { Pipe, PipeTransform } from '@angular/core';
import { formatDate } from '@angular/common';

@Pipe({
  name: 'dateI18n',
  standalone: true,
})
export class DateI18nPipe implements PipeTransform {
  transform(
    value: string | Date | number | null | undefined,
    format = 'fullDate',
    lang = 'es'
  ): string {
    if (!value) return '';

    const localeMap: Record<string, string> = {
      es: 'es',
      en: 'en',
      pt: 'pt',
      fr: 'fr',
      de: 'de',
    };

    const locale = localeMap[lang] ?? 'es';

    // formatDate acepta string/date/number y locale
    return formatDate(value, format, locale);
  }
}
