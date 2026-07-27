import { selectDateInRange } from './date-range-selection.util';

describe('selectDateInRange', () => {
  it('starts a range with the first date', () => {
    expect(selectDateInRange({ start: null, end: null }, '2026-07-15')).toEqual({
      start: '2026-07-15',
      end: null,
    });
  });

  it('sorts the initial range when the second date is earlier', () => {
    expect(selectDateInRange({ start: '2026-07-20', end: null }, '2026-07-15')).toEqual({
      start: '2026-07-15',
      end: '2026-07-20',
    });
  });

  it('preserves the end when selecting a date before a complete range', () => {
    expect(selectDateInRange({ start: '2026-07-15', end: '2026-07-20' }, '2026-07-10')).toEqual({
      start: '2026-07-10',
      end: '2026-07-20',
    });
  });

  it('updates only the end when selecting a later date', () => {
    expect(selectDateInRange({ start: '2026-07-15', end: '2026-07-20' }, '2026-07-25')).toEqual({
      start: '2026-07-15',
      end: '2026-07-25',
    });
  });
});
