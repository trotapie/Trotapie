export interface DateRangeFilterValue {
  start: string | null;
  end: string | null;
}

export const EMPTY_DATE_RANGE: DateRangeFilterValue = { start: null, end: null };
