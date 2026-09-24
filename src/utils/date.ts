import {
  addWeeks,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  formatDistanceToNow,
  startOfMonth,
  startOfWeek,
  isWithinInterval,
  parseISO,
} from 'date-fns';
import type { BudgetPeriod } from '../models/types';

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
  period: BudgetPeriod,
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
