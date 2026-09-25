import {
  dueOccurrences,
  nextOccurrence,
  occurrenceDate,
  recurringTransactionId,
} from '../../src/services/recurring';

const monthly = (overrides = {}) => ({
  startDate: '2026-01-31',
  frequency: 'monthly' as const,
  endDate: null,
  generatedCount: 0,
  isActive: true,
  ...overrides,
});

describe('occurrenceDate', () => {
  it('counts monthly dates from the start so a 31st never drifts down to the 28th', () => {
    expect(occurrenceDate('2026-01-31', 'monthly', 0)).toBe('2026-01-31');
    expect(occurrenceDate('2026-01-31', 'monthly', 1)).toBe('2026-02-28');
    expect(occurrenceDate('2026-01-31', 'monthly', 2)).toBe('2026-03-31');
    expect(occurrenceDate('2026-01-31', 'monthly', 3)).toBe('2026-04-30');
  });

  it('uses the 29th of February in a leap year', () => {
    expect(occurrenceDate('2024-01-31', 'monthly', 1)).toBe('2024-02-29');
  });

  it('steps daily, weekly and yearly', () => {
    expect(occurrenceDate('2026-09-01', 'daily', 3)).toBe('2026-09-04');
    expect(occurrenceDate('2026-09-01', 'weekly', 2)).toBe('2026-09-15');
    expect(occurrenceDate('2026-09-01', 'yearly', 1)).toBe('2027-09-01');
  });

  it('moves a 29 February start to 28 February in a non-leap year', () => {
    expect(occurrenceDate('2024-02-29', 'yearly', 1)).toBe('2025-02-28');
  });
});

describe('dueOccurrences', () => {
  it('is empty before the start date', () => {
    expect(dueOccurrences(monthly(), '2026-01-30')).toEqual([]);
  });

  it('includes an occurrence falling exactly today', () => {
    expect(dueOccurrences(monthly(), '2026-01-31')).toEqual([{ index: 0, date: '2026-01-31' }]);
  });

  it('catches up every missed occurrence, in order', () => {
    const due = dueOccurrences(monthly(), '2026-04-15');
    expect(due.map((entry) => entry.date)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
    expect(due.map((entry) => entry.index)).toEqual([0, 1, 2]);
  });

  it('skips occurrences that were already added', () => {
    const due = dueOccurrences(monthly({ generatedCount: 2 }), '2026-04-15');
    expect(due).toEqual([{ index: 2, date: '2026-03-31' }]);
  });

  it('stops at the end date', () => {
    const due = dueOccurrences(monthly({ endDate: '2026-02-28' }), '2026-12-31');
    expect(due.map((entry) => entry.date)).toEqual(['2026-01-31', '2026-02-28']);
  });

  it('adds nothing while paused', () => {
    expect(dueOccurrences(monthly({ isActive: false }), '2026-12-31')).toEqual([]);
  });

  it('caps a long catch-up so it cannot flood the database', () => {
    const due = dueOccurrences(
      { startDate: '2000-01-01', frequency: 'daily', endDate: null, generatedCount: 0, isActive: true },
      '2026-09-01'
    );
    expect(due.length).toBeLessThanOrEqual(400);
  });
});

describe('nextOccurrence', () => {
  it('is the date after the ones already added', () => {
    expect(nextOccurrence(monthly({ generatedCount: 1 }))).toBe('2026-02-28');
  });

  it('is null once the rule has ended', () => {
    expect(nextOccurrence(monthly({ generatedCount: 2, endDate: '2026-02-28' }))).toBeNull();
  });

  it('is null while paused', () => {
    expect(nextOccurrence(monthly({ isActive: false }))).toBeNull();
  });
});

describe('recurringTransactionId', () => {
  it('is identical on every device for the same occurrence', () => {
    expect(recurringTransactionId('abc', 4)).toBe(recurringTransactionId('abc', 4));
  });

  it('differs between occurrences and between rules', () => {
    expect(recurringTransactionId('abc', 4)).not.toBe(recurringTransactionId('abc', 5));
    expect(recurringTransactionId('abc', 4)).not.toBe(recurringTransactionId('xyz', 4));
  });
});
