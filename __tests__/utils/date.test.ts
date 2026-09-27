import { calendarPeriodRange, currentPeriodRange, isDateWithinRange, nextPeriodAnchor } from '../../src/utils/date';

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

describe('calendarPeriodRange', () => {
  it('gives just the reference date itself for "day"', () => {
    expect(calendarPeriodRange('day', '2026-09-16')).toEqual({ start: '2026-09-16', end: '2026-09-16' });
  });

  it('gives the Monday-to-Sunday week containing the reference date, regardless of any budget anchor', () => {
    // 2026-09-16 is a Wednesday.
    const { start, end } = calendarPeriodRange('week', '2026-09-16');
    expect(start).toBe('2026-09-14'); // Monday
    expect(end).toBe('2026-09-20'); // Sunday
  });

  it('gives the calendar month', () => {
    expect(calendarPeriodRange('month', '2026-09-15')).toEqual({ start: '2026-09-01', end: '2026-09-30' });
  });

  it('gives the calendar year', () => {
    expect(calendarPeriodRange('year', '2026-09-15')).toEqual({ start: '2026-01-01', end: '2026-12-31' });
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
