import { differenceInCalendarMonths, parseISO } from 'date-fns';

/** How far along a goal is, as a whole percentage from 0 to 100. */
export function goalPercent(savedMinor: number, targetMinor: number): number {
  if (targetMinor <= 0) return 0;
  return Math.max(0, Math.min(100, Math.floor((savedMinor * 100) / targetMinor)));
}

export function isGoalReached(savedMinor: number, targetMinor: number): boolean {
  return targetMinor > 0 && savedMinor >= targetMinor;
}

/**
 * How much to put aside each month to reach a goal by its deadline, or null
 * when there is no deadline or the goal is already met. A deadline that has
 * passed (or is this month) means the whole remainder is due now.
 */
export function monthlyAmountNeeded(
  targetMinor: number,
  savedMinor: number,
  deadlineIso: string | null,
  todayIso: string
): number | null {
  if (!deadlineIso) return null;
  const remaining = targetMinor - savedMinor;
  if (remaining <= 0) return null;
  const monthsLeft = Math.max(1, differenceInCalendarMonths(parseISO(deadlineIso), parseISO(todayIso)));
  return Math.ceil(remaining / monthsLeft);
}

export type DebtStatus = 'paid' | 'overdue' | 'open';

export function debtRemaining(amountMinor: number, paidMinor: number): number {
  return Math.max(0, amountMinor - paidMinor);
}

export function debtStatus(
  amountMinor: number,
  paidMinor: number,
  dueDateIso: string | null,
  todayIso: string
): DebtStatus {
  if (paidMinor >= amountMinor) return 'paid';
  if (dueDateIso && dueDateIso < todayIso) return 'overdue';
  return 'open';
}
