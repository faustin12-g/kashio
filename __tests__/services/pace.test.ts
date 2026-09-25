import { computePace, MIN_DAYS_FOR_PACE } from '../../src/services/pace';

// A 30-day month: September 2026.
const base = { periodStart: '2026-09-01', periodEnd: '2026-09-30', limitMinor: 3000 };

describe('computePace', () => {
  it('reports the limit as reached when spending has met it', () => {
    expect(computePace({ ...base, spentMinor: 3000, todayIso: '2026-09-10' }).status).toBe('over');
    expect(computePace({ ...base, spentMinor: 4500, todayIso: '2026-09-10' }).status).toBe('over');
  });

  it('says nothing useful when no money has been spent', () => {
    expect(computePace({ ...base, spentMinor: 0, todayIso: '2026-09-10' }).status).toBe('no_spending');
  });

  it('does not project from the first couple of days', () => {
    expect(MIN_DAYS_FOR_PACE).toBe(3);
    expect(computePace({ ...base, spentMinor: 500, todayIso: '2026-09-02' }).status).toBe('too_early');
  });

  it('is on track when the current rate stays within the limit', () => {
    // 100 a day for 10 days = 1000 so far; projected 3000, exactly the limit.
    const pace = computePace({ ...base, spentMinor: 1000, todayIso: '2026-09-10' });
    expect(pace.status).toBe('on_track');
    expect(pace.projectedMinor).toBe(3000);
  });

  it('warns when the limit will run out before the period ends, and says how many days', () => {
    // 200 a day for 10 days = 2000 so far; 1000 left at 200 a day = 5 more days.
    const pace = computePace({ ...base, spentMinor: 2000, todayIso: '2026-09-10' });
    expect(pace.status).toBe('will_run_out');
    expect(pace.daysUntilRunOut).toBe(5);
    expect(pace.projectedMinor).toBe(6000);
    expect(pace.daysLeft).toBe(20);
  });

  it('handles the last day of the period', () => {
    const pace = computePace({ ...base, spentMinor: 2900, todayIso: '2026-09-30' });
    expect(pace.status).toBe('on_track');
    expect(pace.daysLeft).toBe(0);
  });

  it('copes with a "today" outside the period by clamping to it', () => {
    expect(() => computePace({ ...base, spentMinor: 500, todayIso: '2026-10-05' })).not.toThrow();
    expect(computePace({ ...base, spentMinor: 500, todayIso: '2026-10-05' }).daysLeft).toBe(0);
  });
});
