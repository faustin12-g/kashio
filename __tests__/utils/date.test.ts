import { currentPeriodRange, isDateWithinRange, nextPeriodAnchor } from '../../src/utils/date';

describe('currentPeriodRange (monthly)', () => {
  it('returns the first and last day of the month containing the reference date', () => {
    const { start, end } = currentPeriodRange('monthly', '2026-01-01', '2026-09-15');
    expect(start).toBe('2026-09-01');
    expect(end).toBe('2026-09-30');
  });

  it('handles February in a leap year correctly', () => {
    const { start, end } = currentPeriodRange('monthly', '2024-01-01', '2024-02-10');
    expect(start).toBe('2024-02-01');
    expect(end).toBe('2024-02-29');
  });
});

describe('currentPeriodRange (weekly)', () => {
  it('anchors the week start to the same weekday as the budget start date', () => {
    // 2026-09-16 is a Wednesday.
    const { start, end } = currentPeriodRange('weekly', '2026-09-16', '2026-09-20');
    expect(start).toBe('2026-09-16'); // the Wednesday that starts this week
    expect(end).toBe('2026-09-22'); // the following Tuesday
  });
});

describe('isDateWithinRange', () => {
  it('is inclusive of both endpoints', () => {
    expect(isDateWithinRange('2026-09-01', '2026-09-01', '2026-09-30')).toBe(true);
    expect(isDateWithinRange('2026-09-30', '2026-09-01', '2026-09-30')).toBe(true);
  });

  it('excludes dates outside the range', () => {
    expect(isDateWithinRange('2026-10-01', '2026-09-01', '2026-09-30')).toBe(false);
  });
});

describe('nextPeriodAnchor', () => {
  it('advances a monthly anchor by one month', () => {
    expect(nextPeriodAnchor('monthly', '2026-01-31')).toBe('2026-02-28');
  });

  it('advances a weekly anchor by seven days', () => {
    expect(nextPeriodAnchor('weekly', '2026-09-16')).toBe('2026-09-23');
  });
});
