import { combineBudgetProgress } from '../../src/services/budgetProgress';
import { buildAlertMessage, buildTotalAlertMessage, totalAlertMemoryKey } from '../../src/services/budgetAlerts';
import { makeTranslator } from '../../src/i18n';
import type { Budget, BudgetProgress } from '../../src/models/types';

const progress = (period: Budget['period'], limit: number, spent: number): BudgetProgress => ({
  budget: {
    id: `${period}-${limit}`,
    categoryId: null,
    amountLimitMinor: limit,
    currency: 'RWF',
    period,
    startDate: '2026-09-01',
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
  },
  periodStart: '2026-09-01',
  periodEnd: period === 'once' ? null : '2026-09-30',
  spentMinor: spent,
  remainingMinor: limit - spent,
  percentUsed: limit > 0 ? (spent / limit) * 100 : 0,
});

describe('combineBudgetProgress', () => {
  it('adds monthly and one-time budgets together', () => {
    const total = combineBudgetProgress([progress('monthly', 100_000, 40_000), progress('once', 50_000, 10_000)]);
    expect(total).toEqual({ limitMinor: 150_000, spentMinor: 50_000, percentUsed: (50_000 / 150_000) * 100, count: 2 });
  });

  it('leaves weekly budgets out, since a weekly cap is not the same unit', () => {
    const total = combineBudgetProgress([progress('weekly', 20_000, 20_000), progress('monthly', 100_000, 25_000)]);
    expect(total.limitMinor).toBe(100_000);
    expect(total.spentMinor).toBe(25_000);
    expect(total.count).toBe(1);
  });

  it('reports nothing to total when there are no combinable budgets', () => {
    expect(combineBudgetProgress([]).count).toBe(0);
    expect(combineBudgetProgress([progress('weekly', 1000, 0)]).count).toBe(0);
    expect(combineBudgetProgress([]).percentUsed).toBe(0);
  });
});

describe('budget alert wording', () => {
  const t = makeTranslator('en');

  it('says a one-time budget is tracked "in total", not "this month"', () => {
    const message = buildAlertMessage(
      { threshold: 80, categoryName: 'Clothes', period: 'once', spentMinor: 40_000, limitMinor: 50_000, currency: 'RWF' },
      t
    );
    expect(message.body).toContain('in total');
    expect(message.body).not.toContain('this month');
  });

  it('describes the combined total in its own words', () => {
    const message = buildTotalAlertMessage({ threshold: 90, spentMinor: 90_000, limitMinor: 100_000, currency: 'RWF' }, t);
    expect(message.body).toContain('90%');
    expect(message.body).toContain('all your budgets combined');
  });

  it('remembers the total per month so it is checked afresh each month', () => {
    expect(totalAlertMemoryKey('2026-09')).not.toBe(totalAlertMemoryKey('2026-10'));
  });
});
