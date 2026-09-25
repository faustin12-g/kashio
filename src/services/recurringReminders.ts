import { parseISO, setHours } from 'date-fns';
import type { Recurring } from '../models/types';
import { currentTranslation } from '../i18n/useTranslation';
import type { TFunction } from '../i18n';
import { formatMoney } from '../utils/money';
import { replaceRecurringReminders, type RecurringReminder } from './notifications';
import { upcomingOccurrences } from './recurring';

/** Reminders arrive at 9 in the morning on the day something is due. */
const REMINDER_HOUR = 9;
/** How many upcoming occurrences of each item get a reminder, so a daily item does not fill the phone. */
const REMINDERS_PER_RULE = 3;

/** Builds the reminders for the given items. Exported so it can be tested. */
export function buildRecurringReminders(
  rules: Recurring[],
  currency: string,
  categoryName: (categoryId: string | null) => string,
  t: TFunction
): RecurringReminder[] {
  const reminders: RecurringReminder[] = [];
  for (const rule of rules) {
    const name = rule.note || categoryName(rule.categoryId);
    const amount = formatMoney(rule.amountMinor, currency);
    for (const occurrence of upcomingOccurrences(rule, REMINDERS_PER_RULE)) {
      reminders.push({
        id: `${rule.id}:${occurrence.index}`,
        when: setHours(parseISO(occurrence.date), REMINDER_HOUR),
        title: t('rec.reminderTitle', { name }),
        body: t(rule.type === 'income' ? 'rec.reminderIncome' : 'rec.reminderExpense', { name, amount }),
      });
    }
  }
  return reminders;
}

/** Makes the phone's scheduled reminders match the recurring items. Never throws. */
export async function syncRecurringReminders(
  rules: Recurring[],
  currency: string,
  categoryName: (categoryId: string | null) => string
): Promise<void> {
  try {
    const { t } = currentTranslation();
    await replaceRecurringReminders(buildRecurringReminders(rules, currency, categoryName, t));
  } catch (error) {
    console.warn('Could not schedule recurring reminders', error);
  }
}
