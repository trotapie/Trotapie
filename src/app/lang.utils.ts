const defaultLang = 'es';
const availableLangs = new Set(['es', 'en', 'fr', 'pt', 'de']);

export function getDefaultLang(): string {
  try {
    const savedLang = localStorage.getItem('lang');

    if (savedLang && availableLangs.has(savedLang)) {
      return savedLang;
    }

    localStorage.setItem('lang', defaultLang);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }

  return defaultLang;
}
