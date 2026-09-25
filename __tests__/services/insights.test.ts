import {
  buildMonthSeries,
  compareValues,
  monthBounds,
  topCategoryChanges,
} from '../../src/services/insights';
import { goalPercent, isGoalReached, monthlyAmountNeeded, debtRemaining, debtStatus } from '../../src/services/goalsAndDebts';

describe('buildMonthSeries', () => {
  it('returns the last N months oldest first, filling gaps with zeros', () => {
    const series = buildMonthSeries(
      [
        { month: '2026-07', incomeMinor: 500, expenseMinor: 200 },
        { month: '2026-09', incomeMinor: 0, expenseMinor: 900 },
      ],
      '2026-09',
      4
    );
    expect(series.map((entry) => entry.month)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09']);
    expect(series[0]).toEqual({ month: '2026-06', incomeMinor: 0, expenseMinor: 0 });
    expect(series[1].incomeMinor).toBe(500);
    expect(series[3].expenseMinor).toBe(900);
  });

  it('crosses a year boundary correctly', () => {
    const months = buildMonthSeries([], '2026-02', 3).map((entry) => entry.month);
    expect(months).toEqual(['2025-12', '2026-01', '2026-02']);
  });
});

describe('compareValues', () => {
  it('gives the change and a percentage', () => {
    expect(compareValues(1200, 1000)).toEqual({ deltaMinor: 200, percent: 20 });
    expect(compareValues(800, 1000)).toEqual({ deltaMinor: -200, percent: -20 });
  });

  it('has no percentage when there was nothing to compare with', () => {
    expect(compareValues(500, 0)).toEqual({ deltaMinor: 500, percent: null });
  });
});

describe('topCategoryChanges', () => {
  it('ranks by the size of the swing, in either direction', () => {
    const changes = topCategoryChanges(
      [
        { categoryId: 'food', totalMinor: 900 },
        { categoryId: 'rent', totalMinor: 500 },
        { categoryId: 'fun', totalMinor: 100 },
      ],
      [
        { categoryId: 'food', totalMinor: 400 },
        { categoryId: 'rent', totalMinor: 500 },
        { categoryId: 'travel', totalMinor: 700 },
      ],
      3
    );
    expect(changes.map((change) => change.categoryId)).toEqual(['travel', 'food', 'fun']);
    expect(changes[0].deltaMinor).toBe(-700);
    expect(changes[1].deltaMinor).toBe(500);
  });

  it('leaves out categories that did not change and respects the limit', () => {
    const changes = topCategoryChanges(
      [{ categoryId: 'a', totalMinor: 100 }],
      [{ categoryId: 'a', totalMinor: 100 }],
      3
    );
    expect(changes).toEqual([]);
    expect(
      topCategoryChanges(
        [
          { categoryId: 'a', totalMinor: 1 },
          { categoryId: 'b', totalMinor: 2 },
          { categoryId: 'c', totalMinor: 3 },
        ],
        [],
        2
      )
    ).toHaveLength(2);
  });
});

describe('monthBounds', () => {
  it('gives the first and last day, including leap February', () => {
    expect(monthBounds('2026-09')).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(monthBounds('2024-02')).toEqual({ from: '2024-02-01', to: '2024-02-29' });
    expect(monthBounds('2026-12')).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });
});

describe('goals', () => {
  it('percent is whole, floored, and capped at 100', () => {
    expect(goalPercent(0, 1000)).toBe(0);
    expect(goalPercent(333, 1000)).toBe(33);
    expect(goalPercent(1000, 1000)).toBe(100);
    expect(goalPercent(2500, 1000)).toBe(100);
    expect(goalPercent(-50, 1000)).toBe(0);
    expect(goalPercent(50, 0)).toBe(0);
  });

  it('knows when a goal is reached', () => {
    expect(isGoalReached(1000, 1000)).toBe(true);
    expect(isGoalReached(999, 1000)).toBe(false);
  });

  it('works out the monthly amount needed to hit a deadline', () => {
    // 6,000 still to save with 3 months to go.
    expect(monthlyAmountNeeded(10000, 4000, '2026-12-15', '2026-09-15')).toBe(2000);
  });

  it('rounds the monthly amount up so the goal is never short', () => {
    expect(monthlyAmountNeeded(1000, 0, '2026-12-15', '2026-09-15')).toBe(334);
  });

  it('asks for everything now when the deadline has passed, and nothing when there is none or the goal is met', () => {
    expect(monthlyAmountNeeded(10000, 4000, '2026-01-01', '2026-09-15')).toBe(6000);
    expect(monthlyAmountNeeded(10000, 4000, null, '2026-09-15')).toBeNull();
    expect(monthlyAmountNeeded(10000, 10000, '2026-12-15', '2026-09-15')).toBeNull();
  });
});

describe('debts', () => {
  it('is paid once payments cover the amount', () => {
    expect(debtStatus(1000, 1000, '2020-01-01', '2026-09-15')).toBe('paid');
    expect(debtStatus(1000, 1200, null, '2026-09-15')).toBe('paid');
  });

  it('is overdue when unpaid and past its due date, otherwise open', () => {
    expect(debtStatus(1000, 200, '2026-09-01', '2026-09-15')).toBe('overdue');
    expect(debtStatus(1000, 200, '2026-09-15', '2026-09-15')).toBe('open');
    expect(debtStatus(1000, 200, null, '2026-09-15')).toBe('open');
  });

  it('never reports a negative remainder', () => {
    expect(debtRemaining(1000, 300)).toBe(700);
    expect(debtRemaining(1000, 1500)).toBe(0);
  });
});
