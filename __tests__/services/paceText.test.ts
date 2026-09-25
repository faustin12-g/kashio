import { describePace } from '../../src/services/paceText';
import { makeTranslator } from '../../src/i18n';
import type { Pace } from '../../src/services/pace';

const t = makeTranslator('en');
const money = (minor: number) => `$${minor / 100}`;
const pace = (overrides: Partial<Pace>): Pace => ({
  status: 'on_track',
  projectedMinor: 250000,
  dailyRateMinor: 8000,
  daysLeft: 10,
  daysUntilRunOut: null,
  ...overrides,
});

describe('describePace', () => {
  it('says nothing when there is no spending', () => {
    expect(describePace(pace({ status: 'no_spending' }), t, money)).toBeNull();
  });

  it('is gentle very early in a period', () => {
    expect(describePace(pace({ status: 'too_early' }), t, money)?.tone).toBe('muted');
  });

  it('reports a reached limit as a danger', () => {
    expect(describePace(pace({ status: 'over' }), t, money)).toEqual({
      text: 'The limit has been reached.',
      tone: 'danger',
    });
  });

  it('reassures when on track and shows where spending is heading', () => {
    const result = describePace(pace({ status: 'on_track' }), t, money);
    expect(result?.tone).toBe('good');
    expect(result?.text).toContain('On track');
    expect(result?.text).toContain('$2500');
  });

  it('warns how many days are left, with sensible singular and same-day wording', () => {
    const many = describePace(pace({ status: 'will_run_out', daysUntilRunOut: 6 }), t, money);
    expect(many).toEqual({ text: 'At this pace it runs out in 6 days.', tone: 'warning' });
    expect(describePace(pace({ status: 'will_run_out', daysUntilRunOut: 1 }), t, money)?.text).toBe(
      'At this pace it runs out in 1 day.'
    );
    expect(describePace(pace({ status: 'will_run_out', daysUntilRunOut: 0 }), t, money)?.text).toBe(
      'At this pace it runs out today.'
    );
  });

  it('speaks the chosen language', () => {
    const fr = describePace(pace({ status: 'will_run_out', daysUntilRunOut: 6 }), makeTranslator('fr'), money);
    expect(fr?.text).toBe('À ce rythme, il sera épuisé dans 6 jours.');
  });
});
