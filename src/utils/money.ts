/**
 * Money helpers. Amounts are always handled as integer "minor units"
 * (cents) everywhere except at the UI input/display boundary, so we never
 * accumulate floating point rounding errors in balances or budgets.
 */

/**
 * Parses a user-typed amount string (e.g. "12.5", "12,50", "12") into
 * integer minor units.
 *
 * Deliberately does NOT do `Math.round(Number(input) * 100)` — that looks
 * right but silently breaks on inputs like "1.005", because 1.005 * 100
 * evaluates to 100.49999999999999 in IEEE754 and rounds down to 100
 * instead of 101. Parsing the digits directly as a fixed-point string
 * sidesteps float imprecision entirely, which matters for money.
 */
export function parseAmountToMinor(input: string): number {
  const normalized = input.trim().replace(',', '.');
  if (!/^\d+(\.\d*)?$/.test(normalized)) return NaN;

  const [wholePart, fractionPart = ''] = normalized.split('.');
  const minorFromFraction = (fractionPart + '00').slice(0, 2);
  const roundUpDigit = fractionPart.length > 2 ? fractionPart.charCodeAt(2) - 48 : 0;

  let minor = Number(wholePart) * 100 + Number(minorFromFraction);
  if (roundUpDigit >= 5) minor += 1;
  return minor;
}

/** Formats minor units back into a plain decimal string for editing, e.g. 1250 -> "12.50". */
export function minorToInputString(minor: number): string {
  return (minor / 100).toFixed(2);
}

const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string): Intl.NumberFormat {
  let formatter = currencyFormatterCache.get(currency);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency });
    } catch {
      // Unknown/invalid ISO code (shouldn't happen via the app's currency picker,
      // but keep this defensive so a bad value never crashes rendering).
      formatter = new Intl.NumberFormat(undefined, { style: 'decimal', minimumFractionDigits: 2 });
    }
    currencyFormatterCache.set(currency, formatter);
  }
  return formatter;
}

/** Formats minor units for display, e.g. (1250, "USD") -> "$12.50". */
export function formatMoney(minor: number, currency: string): string {
  return getFormatter(currency).format(minor / 100);
}

/** Formats a signed amount with a leading +/- for transaction lists. */
export function formatSignedMoney(minor: number, currency: string, type: 'expense' | 'income'): string {
  const sign = type === 'expense' ? '−' : '+';
  return `${sign}${formatMoney(minor, currency)}`;
}
