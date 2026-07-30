import { selectDateInRange } from './date-range-selection.util';

describe('selectDateInRange', () => {
  it('starts a range with the first date', () => {
    expect(selectDateInRange({ start: null, end: null }, '2026-07-15', 'start')).toEqual({
      start: '2026-07-15',
      end: null,
    });
  });

  it('uses the first selected date as the start even when the end field is active', () => {
    expect(selectDateInRange({ start: null, end: null }, '2026-07-15', 'end')).toEqual({
      start: '2026-07-15',
      end: null,
    });
  });

  it('sets the end without changing the start', () => {
    expect(selectDateInRange({ start: '2026-07-15', end: null }, '2026-07-20', 'end')).toEqual({
      start: '2026-07-15',
      end: '2026-07-20',
    });
  });

  it('preserves the end when editing the start with an intermediate date', () => {
    expect(selectDateInRange({ start: '2026-07-15', end: '2026-07-20' }, '2026-07-18', 'start')).toEqual({
      start: '2026-07-18',
      end: '2026-07-20',
    });
  });

  it('preserves the start when editing the end with an intermediate date', () => {
    expect(selectDateInRange({ start: '2026-07-15', end: '2026-07-20' }, '2026-07-18', 'end')).toEqual({
      start: '2026-07-15',
      end: '2026-07-18',
    });
  });

  it('swaps the range when the new start is after the end', () => {
    expect(selectDateInRange({ start: '2026-07-15', end: '2026-07-20' }, '2026-07-25', 'start')).toEqual({
      start: '2026-07-20',
      end: '2026-07-25',
    });
  });

  it('makes an earlier end the new start and preserves the former start as end', () => {
    expect(selectDateInRange({ start: '2026-07-15', end: '2026-07-20' }, '2026-07-10', 'end')).toEqual({
      start: '2026-07-10',
      end: '2026-07-15',
    });
  });
});
