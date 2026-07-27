import { DateRangeFilterValue, EMPTY_DATE_RANGE } from './date-range-filter.model';

export function selectDateInRange(
  range: DateRangeFilterValue,
  date: string,
): DateRangeFilterValue {
  if (!range.start) {
    return { start: date, end: null };
  }

  if (!range.end) {
    return date < range.start
      ? { start: date, end: range.start }
      : { start: range.start, end: date };
  }

  if (date < range.start) {
    return { start: date, end: range.end };
  }

  return { start: range.start, end: date };
}

export function emptyDateRange(): DateRangeFilterValue {
  return { ...EMPTY_DATE_RANGE };
}
