import { formatMoney, formatSignedMoney, minorToInputString, parseAmountToMinor } from '../../src/utils/money';

describe('parseAmountToMinor', () => {
  it('converts a plain decimal string to integer minor units', () => {
    expect(parseAmountToMinor('12.50')).toBe(1250);
  });

  it('rounds instead of truncating on float imprecision', () => {
    // 1.005 * 100 is 100.49999999999999 in IEEE754 — must still round to 100 minor units (1.00), not 100.49.
    expect(parseAmountToMinor('1.005')).toBe(101);
  });

  it('accepts a comma decimal separator', () => {
    expect(parseAmountToMinor('12,50')).toBe(1250);
  });

  it('accepts a bare integer', () => {
    expect(parseAmountToMinor('20')).toBe(2000);
  });

  it('rejects empty input', () => {
    expect(Number.isNaN(parseAmountToMinor(''))).toBe(true);
  });

  it('rejects negative input', () => {
    expect(Number.isNaN(parseAmountToMinor('-5'))).toBe(true);
  });

  it('rejects non-numeric input', () => {
    expect(Number.isNaN(parseAmountToMinor('abc'))).toBe(true);
  });
});

describe('minorToInputString', () => {
  it('round-trips with parseAmountToMinor', () => {
    expect(minorToInputString(1250)).toBe('12.50');
    expect(parseAmountToMinor(minorToInputString(1250))).toBe(1250);
  });
});

describe('formatMoney', () => {
  it('formats minor units as a currency string', () => {
    expect(formatMoney(1250, 'USD')).toContain('12.50');
  });

  it('falls back gracefully for an unknown currency code instead of throwing', () => {
    expect(() => formatMoney(1250, 'NOT_A_CODE')).not.toThrow();
  });
});

describe('formatSignedMoney', () => {
  it('prefixes expenses with a minus sign', () => {
    expect(formatSignedMoney(500, 'USD', 'expense')).toMatch(/^−/);
  });

  it('prefixes income with a plus sign', () => {
    expect(formatSignedMoney(500, 'USD', 'income')).toMatch(/^\+/);
  });
});
