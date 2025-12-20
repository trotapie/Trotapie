export function getDefaultLang(): string {
  const savedLang = localStorage.getItem('lang');

  if (savedLang) {
    return savedLang;
  }

  const defaultLang = 'es';
  localStorage.setItem('lang', defaultLang);
  return defaultLang;
}
