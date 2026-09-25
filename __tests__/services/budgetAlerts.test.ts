import {
  ALERT_THRESHOLDS,
  alertMemoryKey,
  buildAlertMessage,
  decideBudgetAlert,
  highestReachedThreshold,
} from '../../src/services/budgetAlerts';
import { makeTranslator } from '../../src/i18n';

const t = makeTranslator('en');

describe('ALERT_THRESHOLDS', () => {
  it('are exactly the levels you asked for', () => {
    expect([...ALERT_THRESHOLDS]).toEqual([50, 70, 80, 90, 100]);
  });
});

describe('highestReachedThreshold', () => {
  it('is 0 below the first threshold', () => {
    expect(highestReachedThreshold(499, 1000)).toBe(0);
    expect(highestReachedThreshold(0, 1000)).toBe(0);
  });

  it('counts a threshold as reached exactly at that percentage', () => {
    expect(highestReachedThreshold(500, 1000)).toBe(50);
    expect(highestReachedThreshold(700, 1000)).toBe(70);
    expect(highestReachedThreshold(800, 1000)).toBe(80);
    expect(highestReachedThreshold(900, 1000)).toBe(90);
    expect(highestReachedThreshold(1000, 1000)).toBe(100);
  });

  it('reports the highest level passed, not the first', () => {
    expect(highestReachedThreshold(850, 1000)).toBe(80);
    expect(highestReachedThreshold(999, 1000)).toBe(90);
  });

  it('stays at 100 when the budget is exceeded', () => {
    expect(highestReachedThreshold(2500, 1000)).toBe(100);
  });

  it('never divides by a zero or negative limit', () => {
    expect(highestReachedThreshold(100, 0)).toBe(0);
    expect(highestReachedThreshold(100, -5)).toBe(0);
  });

  it('is exact with amounts that break floating point maths', () => {
    // 0.1 + 0.2 style trouble: 70% of 3 is 2.1, and 2.1 stored as 21 of 30 must count.
    expect(highestReachedThreshold(21, 30)).toBe(70);
  });
});

describe('decideBudgetAlert', () => {
  it('notifies the first time a threshold is crossed', () => {
    expect(decideBudgetAlert(500, 1000, 0)).toEqual({ notify: 50, nextLastNotified: 50 });
  });

  it('stays silent when nothing new was crossed', () => {
    expect(decideBudgetAlert(550, 1000, 50)).toEqual({ notify: null, nextLastNotified: 50 });
  });

  it('sends one alert when several thresholds are skipped at once', () => {
    expect(decideBudgetAlert(850, 1000, 0)).toEqual({ notify: 80, nextLastNotified: 80 });
  });

  it('notifies each new level as spending climbs', () => {
    expect(decideBudgetAlert(700, 1000, 50).notify).toBe(70);
    expect(decideBudgetAlert(900, 1000, 80).notify).toBe(90);
    expect(decideBudgetAlert(1000, 1000, 90).notify).toBe(100);
  });

  it('does not repeat the 100% alert while still over budget', () => {
    expect(decideBudgetAlert(1500, 1000, 100)).toEqual({ notify: null, nextLastNotified: 100 });
  });

  it('forgets a level when spending drops, so crossing it again alerts again', () => {
    const afterDrop = decideBudgetAlert(400, 1000, 80);
    expect(afterDrop).toEqual({ notify: null, nextLastNotified: 0 });
    expect(decideBudgetAlert(800, 1000, afterDrop.nextLastNotified).notify).toBe(80);
  });
});

describe('buildAlertMessage', () => {
  const base = { period: 'monthly' as const, spentMinor: 800000, limitMinor: 1000000, currency: 'USD' };

  it('says how much of which budget has been used', () => {
    const { title, body } = buildAlertMessage({ ...base, threshold: 80, categoryName: 'Groceries' }, t);
    expect(title).toBe('Budget alert');
    expect(body).toContain('You have used 80% of your Groceries budget this month.');
    expect(body).toContain('8,000.00');
    expect(body).toContain('10,000.00');
  });

  it('calls a category-less budget the overall budget', () => {
    const { body } = buildAlertMessage({ ...base, threshold: 50, categoryName: null }, t);
    expect(body).toContain('50% of your overall budget');
  });

  it('says "this week" for a weekly budget', () => {
    const { body } = buildAlertMessage({ ...base, period: 'weekly', threshold: 70, categoryName: 'Transport' }, t);
    expect(body).toContain('this week');
  });

  it('speaks French when the language is French', () => {
    const { title, body } = buildAlertMessage(
      { ...base, threshold: 80, categoryName: 'Groceries' },
      makeTranslator('fr')
    );
    expect(title).toBe('Alerte budget');
    expect(body).toContain('Vous avez utilisé 80 % de votre budget Courses ce mois-ci.');
  });

  it('uses a stronger title at 100%', () => {
    const { title } = buildAlertMessage({ ...base, threshold: 100, categoryName: 'Rent' }, t);
    expect(title).toBe('Budget limit reached');
  });
});

describe('alertMemoryKey', () => {
  it('is different for each budget and each period so alerts reset every period', () => {
    expect(alertMemoryKey('b1', '2026-09-01')).not.toBe(alertMemoryKey('b1', '2026-10-01'));
    expect(alertMemoryKey('b1', '2026-09-01')).not.toBe(alertMemoryKey('b2', '2026-09-01'));
  });
});
