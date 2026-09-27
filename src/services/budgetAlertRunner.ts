import type { SQLiteDatabase } from 'expo-sqlite';
import { listCategories } from '../repositories/categoriesRepository';
import { getMeta, setMeta, META_KEYS } from '../repositories/metaRepository';
import { currentTranslation } from '../i18n/useTranslation';
import {
  alertMemoryKey,
  buildAlertMessage,
  buildTotalAlertMessage,
  decideBudgetAlert,
  totalAlertMemoryKey,
} from './budgetAlerts';
import { combineBudgetProgress, listBudgetProgress } from './budgetProgress';
import { showNotification } from './notifications';
import { todayIso } from '../utils/date';

/**
 * Looks at every budget and sends a notification for any that just crossed
 * 50%, 70%, 80%, 90% or 100% of its limit — both each budget on its own, and
 * the combined total across every monthly and one-time budget. Called after
 * anything that changes spending or budgets (saving, editing or deleting a
 * transaction, saving a budget). Never throws: an alert failing must not
 * break saving a transaction.
 */
export async function checkBudgetAlerts(db: SQLiteDatabase): Promise<void> {
  try {
    const [progressList, categories] = await Promise.all([
      listBudgetProgress(db),
      listCategories(db, { includeArchived: true }),
    ]);
    const categoryName = new Map(categories.map((category) => [category.id, category.name]));
    // Amounts are shown in the one currency chosen in Settings, whatever a row was saved with.
    const currency = (await getMeta(db, META_KEYS.currency)) ?? 'USD';
    const { t } = currentTranslation();

    for (const progress of progressList) {
      const { budget, spentMinor, periodStart } = progress;
      const key = alertMemoryKey(budget.id, periodStart);
      const lastNotified = Number((await getMeta(db, key)) ?? 0);

      const decision = decideBudgetAlert(spentMinor, budget.amountLimitMinor, lastNotified);

      if (decision.notify !== null) {
        const message = buildAlertMessage(
          {
            threshold: decision.notify,
            categoryName: budget.categoryId ? (categoryName.get(budget.categoryId) ?? null) : null,
            period: budget.period,
            spentMinor,
            limitMinor: budget.amountLimitMinor,
            currency,
          },
          t
        );
        const shown = await showNotification(message.title, message.body, { kind: 'budget', route: '/budgets' });
        // Only remember it once it was really shown, so a user who allows
        // notifications later still gets the alert for where they stand.
        if (shown) await setMeta(db, key, String(decision.nextLastNotified));
      } else if (decision.nextLastNotified !== lastNotified) {
        await setMeta(db, key, String(decision.nextLastNotified));
      }
    }

    // The total's "already alerted" memory is keyed by the current month, so a
    // long-running one-time budget that never resets on its own still gets a
    // fresh check each month rather than going silent forever after its first alert.
    const total = combineBudgetProgress(progressList);
    if (total.count > 0) {
      const totalKey = totalAlertMemoryKey(todayIso().slice(0, 7));
      const lastNotified = Number((await getMeta(db, totalKey)) ?? 0);
      const decision = decideBudgetAlert(total.spentMinor, total.limitMinor, lastNotified);

      if (decision.notify !== null) {
        const message = buildTotalAlertMessage(
          { threshold: decision.notify, spentMinor: total.spentMinor, limitMinor: total.limitMinor, currency },
          t
        );
        const shown = await showNotification(message.title, message.body, { kind: 'budget', route: '/budgets' });
        if (shown) await setMeta(db, totalKey, String(decision.nextLastNotified));
      } else if (decision.nextLastNotified !== lastNotified) {
        await setMeta(db, totalKey, String(decision.nextLastNotified));
      }
    }
  } catch (error) {
    console.warn('Budget alert check failed', error);
  }
}
