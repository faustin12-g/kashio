import { formatMoney } from '../utils/money';
import type { BudgetPeriod } from '../models/types';
import { categoryDisplayName, type TFunction } from '../i18n';

/** Percentages of a budget at which the user is alerted. */
export const ALERT_THRESHOLDS = [50, 70, 80, 90, 100] as const;

/**
 * The highest alert threshold that spending has reached, or 0 if none.
 *
 * Works in integer minor units (`spent * 100 >= limit * threshold`) instead
 * of dividing to a float, so a budget of 1000 with exactly 500 spent counts
 * as exactly 50% and never as 49.999...%.
 */
export function highestReachedThreshold(spentMinor: number, limitMinor: number): number {
  if (limitMinor <= 0) return 0;
  let reached = 0;
  for (const threshold of ALERT_THRESHOLDS) {
    if (spentMinor * 100 >= limitMinor * threshold) reached = threshold;
  }
  return reached;
}

export interface AlertDecision {
  /** The threshold to notify about now, or null for no notification. */
  notify: number | null;
  /** What to remember as "already alerted up to" for this budget and period. */
  nextLastNotified: number;
}

/**
 * Decides whether a spending change deserves a notification.
 *
 * - Crossing a new, higher threshold notifies once, however many were skipped
 *   (jumping from 40% to 85% alerts about 80%, not 50/70/80 in a burst).
 * - Staying at the same level stays silent.
 * - If spending drops (an edit or delete), the remembered level drops with
 *   it, so crossing the threshold again later alerts again.
 */
export function decideBudgetAlert(
  spentMinor: number,
  limitMinor: number,
  lastNotified: number
): AlertDecision {
  const reached = highestReachedThreshold(spentMinor, limitMinor);
  if (reached > lastNotified) return { notify: reached, nextLastNotified: reached };
  return { notify: null, nextLastNotified: reached };
}

export interface AlertMessageInput {
  threshold: number;
  /** Category name, or null for an overall budget. */
  categoryName: string | null;
  period: BudgetPeriod;
  spentMinor: number;
  limitMinor: number;
  currency: string;
}

/** The text shown in the notification, in the user's language. */
export function buildAlertMessage(input: AlertMessageInput, t: TFunction): { title: string; body: string } {
  const budget = input.categoryName
    ? t('alert.budgetOf', { name: categoryDisplayName(input.categoryName, t) })
    : t('alert.overallBudget');
  const when = input.period === 'weekly' ? t('alert.thisWeek') : t('alert.thisMonth');
  const amounts = t('alert.amounts', {
    spent: formatMoney(input.spentMinor, input.currency),
    limit: formatMoney(input.limitMinor, input.currency),
  });

  return {
    title: input.threshold >= 100 ? t('alert.titleLimit') : t('alert.title'),
    body: t('alert.body', { percent: input.threshold, budget, when, amounts }),
  };
}

/** Key under which the "already alerted" level is remembered for one budget in one period. */
export function alertMemoryKey(budgetId: string, periodStart: string): string {
  return `budget_alert:${budgetId}:${periodStart}`;
}
