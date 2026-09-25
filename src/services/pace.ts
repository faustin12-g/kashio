import { differenceInCalendarDays, parseISO } from 'date-fns';

export type PaceStatus =
  /** Too few days into the period to say anything useful. */
  | 'too_early'
  /** Nothing spent yet. */
  | 'no_spending'
  /** The limit has been reached or passed. */
  | 'over'
  /** At the current rate the period will finish within the limit. */
  | 'on_track'
  /** At the current rate the limit will run out before the period ends. */
  | 'will_run_out';

export interface Pace {
  status: PaceStatus;
  /** Where spending is heading by the end of the period, at the current daily rate. */
  projectedMinor: number;
  dailyRateMinor: number;
  daysLeft: number;
  /** Days from today until the limit runs out; only set when status is 'will_run_out'. */
  daysUntilRunOut: number | null;
}

/** Fewer days than this into a period and a projection is just noise. */
export const MIN_DAYS_FOR_PACE = 3;

export interface PaceInput {
  spentMinor: number;
  limitMinor: number;
  periodStart: string;
  periodEnd: string;
  todayIso: string;
}

/**
 * Projects a budget forward: "at this pace you will use it all up in N days".
 * The daily rate is spending so far divided by days elapsed, applied to the
 * whole period.
 */
export function computePace(input: PaceInput): Pace {
  const { spentMinor, limitMinor, periodStart, periodEnd, todayIso } = input;
  const daysTotal = differenceInCalendarDays(parseISO(periodEnd), parseISO(periodStart)) + 1;
  const rawElapsed = differenceInCalendarDays(parseISO(todayIso), parseISO(periodStart)) + 1;
  const daysElapsed = Math.min(Math.max(rawElapsed, 1), daysTotal);
  const daysLeft = daysTotal - daysElapsed;
  const dailyRateMinor = spentMinor / daysElapsed;
  const projectedMinor = Math.round(dailyRateMinor * daysTotal);

  const base = { projectedMinor, dailyRateMinor: Math.round(dailyRateMinor), daysLeft, daysUntilRunOut: null };

  if (spentMinor >= limitMinor && limitMinor > 0) return { ...base, status: 'over' };
  if (spentMinor <= 0) return { ...base, status: 'no_spending' };
  if (daysElapsed < MIN_DAYS_FOR_PACE) return { ...base, status: 'too_early' };
  if (projectedMinor <= limitMinor) return { ...base, status: 'on_track' };

  const daysUntilRunOut = Math.floor((limitMinor - spentMinor) / dailyRateMinor);
  return { ...base, status: 'will_run_out', daysUntilRunOut };
}
