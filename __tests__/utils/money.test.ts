import {
  formatAmountForInput,
  formatMoney,
  formatSignedMoney,
  minorToInputString,
  parseAmountToMinor,
  parseSignedAmountToMinor,
  sanitizeAmountInput,
} from '../../src/utils/money';

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

describe('parseSignedAmountToMinor', () => {
  it('reads positive amounts like the normal parser', () => {
    expect(parseSignedAmountToMinor('12.50')).toBe(1250);
  });

  it('reads a negative amount', () => {
    expect(parseSignedAmountToMinor('-12.50')).toBe(-1250);
  });

  it('treats minus zero as plain zero', () => {
    expect(Object.is(parseSignedAmountToMinor('-0'), 0)).toBe(true);
  });

  it('rejects text, a lone minus, and a double minus', () => {
    expect(Number.isNaN(parseSignedAmountToMinor('abc'))).toBe(true);
    expect(Number.isNaN(parseSignedAmountToMinor('-'))).toBe(true);
    expect(Number.isNaN(parseSignedAmountToMinor('--5'))).toBe(true);
  });
});

describe('amount typing helpers', () => {
  it('adds thousands separators as digits are typed', () => {
    expect(formatAmountForInput('')).toBe('');
    expect(formatAmountForInput('35')).toBe('35');
    expect(formatAmountForInput('350')).toBe('350');
    expect(formatAmountForInput('3500')).toBe('3,500');
    expect(formatAmountForInput('35000')).toBe('35,000');
    expect(formatAmountForInput('1234567')).toBe('1,234,567');
    expect(formatAmountForInput('1234.5')).toBe('1,234.5');
    expect(formatAmountForInput('1234.')).toBe('1,234.');
    expect(formatAmountForInput('-2500')).toBe('-2,500');
  });

  it('keeps the value free of commas', () => {
    // The screen shows "3,500"; the person types a 0 after it.
    expect(sanitizeAmountInput('3,5000', '3500')).toBe('35000');
    expect(sanitizeAmountInput('35,000', '3500')).toBe('35000');
  });

  it('allows one decimal point and two decimals', () => {
    expect(sanitizeAmountInput('12.345', '12.34')).toBe('12.34');
    expect(sanitizeAmountInput('1.2.3', '1.2')).toBe('1.23');
    expect(sanitizeAmountInput('.', '')).toBe('0.');
  });

  it('treats a comma typed at the end as the decimal point', () => {
    expect(sanitizeAmountInput('35,000,', '35000')).toBe('35000.');
    expect(sanitizeAmountInput('12,', '12')).toBe('12.');
  });

  it('drops leading zeros and stray characters', () => {
    expect(sanitizeAmountInput('007', '00')).toBe('7');
    expect(sanitizeAmountInput('12abc', '12')).toBe('12');
  });

  it('accepts a minus sign only when signed', () => {
    expect(sanitizeAmountInput('-500', '', true)).toBe('-500');
    expect(sanitizeAmountInput('-500', '')).toBe('500');
  });

  it('round-trips through the parser', () => {
    expect(parseAmountToMinor(sanitizeAmountInput('35,000', '3500'))).toBe(3_500_000);
  });
});
