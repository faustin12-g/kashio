import { addDays, addMonths, addWeeks, addYears, format, parseISO } from 'date-fns';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Recurring, RecurringFrequency } from '../models/types';
import { createTransaction } from '../repositories/transactionsRepository';
import { setGeneratedCount } from '../repositories/recurringRepository';

/** Stops a rule that was left untouched for years from listing an endless number of due items. */
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

type RuleSchedule = Pick<Recurring, 'startDate' | 'frequency' | 'endDate' | 'generatedCount' | 'isActive'>;

/** The occurrences that have come due (up to and including today) but have not been recorded or skipped yet. */
export function dueOccurrences(rule: RuleSchedule, todayIso: string): DueOccurrence[] {
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

/** The next date a rule is due, or null if it has ended or is paused. */
export function nextOccurrence(rule: RuleSchedule): string | null {
  if (!rule.isActive) return null;
  const date = occurrenceDate(rule.startDate, rule.frequency, rule.generatedCount);
  if (rule.endDate && date > rule.endDate) return null;
  return date;
}

/**
 * The next few occurrences that have not been recorded or skipped yet,
 * whether they are already due or still ahead. Used to schedule reminders.
 */
export function upcomingOccurrences(rule: RuleSchedule, count: number): DueOccurrence[] {
  if (!rule.isActive) return [];
  const upcoming: DueOccurrence[] = [];
  for (let index = rule.generatedCount; upcoming.length < count; index++) {
    const date = occurrenceDate(rule.startDate, rule.frequency, index);
    if (rule.endDate && date > rule.endDate) break;
    upcoming.push({ index, date });
  }
  return upcoming;
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
 * Turns one due occurrence into a real transaction. Recurring items are
 * reminders: nothing reaches the balance until the person confirms it here.
 * The occurrence is marked as handled in the same step, so it can never be
 * recorded twice.
 */
export async function recordOccurrence(
  db: SQLiteDatabase,
  rule: Recurring,
  occurrence: DueOccurrence,
  currency: string
): Promise<void> {
  await db.withTransactionAsync(async () => {
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
    await setGeneratedCount(db, rule.id, occurrence.index + 1);
  });
}

/** Marks one occurrence as handled without recording anything, e.g. "I did not pay it this month". */
export async function skipOccurrence(db: SQLiteDatabase, rule: Recurring, occurrence: DueOccurrence): Promise<void> {
  await setGeneratedCount(db, rule.id, occurrence.index + 1);
}
