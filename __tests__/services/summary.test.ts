import { buildSummary } from '../../src/services/summary';
import { DEFAULT_THEME_MODE, parseThemeMode } from '../../src/constants/themeMode';

describe('buildSummary', () => {
  it('balance is income minus spending', () => {
    expect(buildSummary(500000, 180000)).toEqual({
      incomeMinor: 500000,
      expenseMinor: 180000,
      balanceMinor: 320000,
    });
  });

  it('goes negative when more went out than came in', () => {
    expect(buildSummary(1000, 2500).balanceMinor).toBe(-1500);
  });

  it('is all zero with nothing recorded', () => {
    expect(buildSummary(0, 0)).toEqual({ incomeMinor: 0, expenseMinor: 0, balanceMinor: 0 });
  });
});

describe('parseThemeMode', () => {
  it('accepts the three valid modes', () => {
    expect(parseThemeMode('system')).toBe('system');
    expect(parseThemeMode('light')).toBe('light');
    expect(parseThemeMode('dark')).toBe('dark');
  });

  it('follows the phone when nothing valid is stored', () => {
    expect(DEFAULT_THEME_MODE).toBe('system');
    expect(parseThemeMode(null)).toBe('system');
    expect(parseThemeMode(undefined)).toBe('system');
    expect(parseThemeMode('')).toBe('system');
    expect(parseThemeMode('purple')).toBe('system');
  });
});
