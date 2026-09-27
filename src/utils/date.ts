import {
  addWeeks,
  addMonths,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  formatDistanceToNow,
  startOfMonth,
  startOfWeek,
  startOfYear,
  isWithinInterval,
  parseISO,
} from 'date-fns';
import type { BudgetPeriod } from '../models/types';

/** The two periods that actually reset on a schedule; a "once" budget has no period to compute here. */
type ResettingBudgetPeriod = Exclude<BudgetPeriod, 'once'>;

/** Today as an ISO date string (yyyy-MM-dd), in the device's local time. */
export function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function fromIsoDate(iso: string): Date {
  return parseISO(iso);
}

/** Human-friendly date for list rows, e.g. "Tue, 24 Sep 2026". */
export function formatDisplayDate(iso: string): string {
  return format(parseISO(iso), 'EEE, d MMM yyyy');
}

/**
 * Returns the [start, end] ISO dates of the budget period that contains
 * `reference` (defaults to today), anchored to the budget's `startDate`
 * weekday/day-of-month.
 */
export function currentPeriodRange(
  period: ResettingBudgetPeriod,
  anchorIso: string,
  referenceIso: string = todayIso()
): { start: string; end: string } {
  const reference = parseISO(referenceIso);

  if (period === 'weekly') {
    const anchor = parseISO(anchorIso);
    const weekStartsOn = anchor.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const start = startOfWeek(reference, { weekStartsOn });
    const end = endOfWeek(reference, { weekStartsOn });
    return { start: toIsoDate(start), end: toIsoDate(end) };
  }

  // monthly
  const start = startOfMonth(reference);
  const end = endOfMonth(reference);
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

/**
 * The [start, end] ISO dates of the day, calendar week (Monday–Sunday),
 * month or year containing `reference` (defaults to today). Unlike
 * `currentPeriodRange`, this is not anchored to anything the user chose —
 * it is the everyday sense of "this week" / "this year", used for Home's
 * period switcher.
 */
export function calendarPeriodRange(
  period: 'day' | 'week' | 'month' | 'year',
  referenceIso: string = todayIso()
): { start: string; end: string } {
  const reference = parseISO(referenceIso);
  if (period === 'day') {
    return { start: referenceIso, end: referenceIso };
  }
  if (period === 'week') {
    return {
      start: toIsoDate(startOfWeek(reference, { weekStartsOn: 1 })),
      end: toIsoDate(endOfWeek(reference, { weekStartsOn: 1 })),
    };
  }
  if (period === 'year') {
    return { start: toIsoDate(startOfYear(reference)), end: toIsoDate(endOfYear(reference)) };
  }
  return { start: toIsoDate(startOfMonth(reference)), end: toIsoDate(endOfMonth(reference)) };
}

export function isDateWithinRange(dateIso: string, startIso: string, endIso: string): boolean {
  const date = parseISO(dateIso);
  return isWithinInterval(date, { start: parseISO(startIso), end: parseISO(endIso) });
}

export function nextPeriodAnchor(period: BudgetPeriod, anchorIso: string): string {
  const anchor = parseISO(anchorIso);
  return toIsoDate(period === 'weekly' ? addWeeks(anchor, 1) : addMonths(anchor, 1));
}

/** e.g. "2 hours ago" — used for last-backup/last-restore labels. */
export function formatRelativeToNow(epochMs: number): string {
  return formatDistanceToNow(new Date(epochMs), { addSuffix: true });
}
