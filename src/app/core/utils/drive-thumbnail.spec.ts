import { driveThumbnailUrl } from './drive-thumbnail';

describe('Drive thumbnails', () => {
  it('uses smaller previews without changing the original source', () => {
    const original = 'https://drive.google.com/thumbnail?id=photo123&sz=w1000';
    const thumbnail = new URL(driveThumbnailUrl(original));
    expect(thumbnail.searchParams.get('sz')).toBe('w320');
    expect(thumbnail.searchParams.get('id')).toBe('photo123');
    expect(original).toContain('sz=w1000');
  });

  it('preserves additional Drive parameters', () => {
    const url = new URL(driveThumbnailUrl('https://drive.google.com/thumbnail?id=photo&sz=w1000&resourcekey=key'));
    expect(url.searchParams.get('resourcekey')).toBe('key');
  });

  it('leaves external, signed, local and data URLs untouched', () => {
    for (const url of [
      'https://example.com/photo?sz=w1000&signature=abc', '/assets/photo.jpg',
      'data:image/png;base64,abc', 'blob:https://example.com/image', '',
      'https://drive.google.com/file/d/photo/view',
      'https://drive.google.com.evil.test/thumbnail?id=photo&sz=w1000',
      'https://drive.google.com/thumbnail?sz=w1000'
    ]) expect(driveThumbnailUrl(url)).toBe(url);
  });

  it('bounds preview sizes and rejects invalid sizes', () => {
    const original = 'https://drive.google.com/thumbnail?id=photo&sz=w1000';
    expect(new URL(driveThumbnailUrl(original, 5000)).searchParams.get('sz')).toBe('w1000');
    expect(new URL(driveThumbnailUrl(original, 1)).searchParams.get('sz')).toBe('w64');
    expect(driveThumbnailUrl(original, NaN)).toBe(original);
  });
});
