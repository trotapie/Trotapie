import { DateRangeFilterValue, EMPTY_DATE_RANGE } from './date-range-filter.model';

export type DateRangeEndpoint = 'start' | 'end';

export function selectDateInRange(
  range: DateRangeFilterValue,
  date: string,
  endpoint: DateRangeEndpoint,
): DateRangeFilterValue {
  if (!range.start) {
    return { start: date, end: null };
  }

  if (endpoint === 'start') {
    return range.end && date > range.end
      ? { start: range.end, end: date }
      : { start: date, end: range.end };
  }

  return range.start && date < range.start
    ? { start: date, end: range.start }
    : { start: range.start, end: date };
}

export function emptyDateRange(): DateRangeFilterValue {
  return { ...EMPTY_DATE_RANGE };
}
