/** Resize only the known Drive thumbnail endpoint; never alter stored URLs. */
export function driveThumbnailUrl(source: string, width = 320): string {
  if (!source || !Number.isFinite(width) || width <= 0) return source;
  try {
    const url = new URL(source);
    if (url.protocol !== 'https:' || url.hostname !== 'drive.google.com' ||
      url.pathname !== '/thumbnail' || !url.searchParams.get('id')) return source;
    url.searchParams.set('sz', `w${Math.min(1000, Math.max(64, Math.round(width)))}`);
    return url.href;
  } catch {
    return source;
  }
}
