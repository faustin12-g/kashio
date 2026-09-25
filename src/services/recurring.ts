import { addDays, addMonths, addWeeks, addYears, format, parseISO } from 'date-fns';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Recurring, RecurringFrequency } from '../models/types';
import { createTransaction } from '../repositories/transactionsRepository';
import { listRecurring, setGeneratedCount } from '../repositories/recurringRepository';

/** Stops a rule that was left untouched for years from adding an endless flood in one go. */
const MAX_CATCH_UP = 400;

/**
 * The date of the n-th occurrence (0 is the start date itself). Counted from
 * the start date every time, never from the previous occurrence, so a rule
 * that starts on the 31st gives Jan 31, Feb 28, Mar 31 and not a slow drift
 * down to the 28th.
 */
export function occurrenceDate(startIso: string, frequency: RecurringFrequency, index: number): string {
  const start = parseISO(startIso);
  const date =
    frequency === 'daily'
      ? addDays(start, index)
      : frequency === 'weekly'
        ? addWeeks(start, index)
        : frequency === 'monthly'
          ? addMonths(start, index)
          : addYears(start, index);
  return format(date, 'yyyy-MM-dd');
}

export interface DueOccurrence {
  index: number;
  date: string;
}

/** The occurrences that have come due (up to and including today) but have not been added yet. */
export function dueOccurrences(
  rule: Pick<Recurring, 'startDate' | 'frequency' | 'endDate' | 'generatedCount' | 'isActive'>,
  todayIso: string
): DueOccurrence[] {
  if (!rule.isActive) return [];
  const due: DueOccurrence[] = [];
  for (let index = rule.generatedCount; due.length < MAX_CATCH_UP; index++) {
    const date = occurrenceDate(rule.startDate, rule.frequency, index);
    if (date > todayIso) break;
    if (rule.endDate && date > rule.endDate) break;
    due.push({ index, date });
  }
  return due;
}

/** The next date a rule will add something, or null if it has ended or is paused. */
export function nextOccurrence(
  rule: Pick<Recurring, 'startDate' | 'frequency' | 'endDate' | 'generatedCount' | 'isActive'>
): string | null {
  if (!rule.isActive) return null;
  const date = occurrenceDate(rule.startDate, rule.frequency, rule.generatedCount);
  if (rule.endDate && date > rule.endDate) return null;
  return date;
}

/**
 * The id every device gives the transaction for one occurrence of one rule.
 * Because it is the same everywhere, restoring a backup from another device
 * can never produce a duplicate of an occurrence that already exists.
 */
export function recurringTransactionId(ruleId: string, index: number): string {
  return `rec:${ruleId}:${index}`;
}

/**
 * Adds every recurring transaction that has come due. Safe to call as often
 * as you like: already-added occurrences are remembered and skipped.
 * Returns how many transactions were added.
 */
export async function generateDueRecurring(
  db: SQLiteDatabase,
  todayIso: string,
  currency: string
): Promise<number> {
  const rules = await listRecurring(db);
  let created = 0;

  await db.withTransactionAsync(async () => {
    for (const rule of rules) {
      const due = dueOccurrences(rule, todayIso);
      if (due.length === 0) continue;

      for (const occurrence of due) {
        await createTransaction(
          db,
          {
            amountMinor: rule.amountMinor,
            currency,
            type: rule.type,
            categoryId: rule.categoryId,
            note: rule.note,
            date: occurrence.date,
            accountId: rule.accountId,
            recurringId: rule.id,
          },
          { id: recurringTransactionId(rule.id, occurrence.index) }
        );
        created++;
      }
      await setGeneratedCount(db, rule.id, due[due.length - 1].index + 1);
    }
  });

  return created;
}
