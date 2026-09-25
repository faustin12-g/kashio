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

/**
 * Like `parseAmountToMinor`, but accepts a leading minus sign, for things that
 * can legitimately be negative such as an overdrawn account.
 */
export function parseSignedAmountToMinor(input: string): number {
  const trimmed = input.trim();
  if (trimmed.startsWith('-')) {
    const magnitude = parseAmountToMinor(trimmed.slice(1));
    return Number.isNaN(magnitude) ? NaN : magnitude === 0 ? 0 : -magnitude;
  }
  return parseAmountToMinor(trimmed);
}

/**
 * How an amount is shown while it is being typed: thousands separated by
 * commas, decimals after a point. "35000" -> "35,000", "1234.5" -> "1,234.5".
 * The value the form keeps (and parses) is always the plain "raw" text with
 * no commas; this is only for display.
 */
export function formatAmountForInput(raw: string): string {
  const negative = raw.startsWith('-');
  const body = negative ? raw.slice(1) : raw;
  const dot = body.indexOf('.');
  const whole = dot === -1 ? body : body.slice(0, dot);
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (negative ? '-' : '') + grouped + (dot === -1 ? '' : body.slice(dot));
}

/**
 * Turns what the person just typed into the plain raw text a form keeps:
 * digits and at most one decimal point with two decimals, no commas (they
 * are added back for display). `previousRaw` is the raw text before this
 * keystroke; it lets a comma typed at the very end count as the decimal
 * point, which is what the decimal key produces on phones set to a language
 * that writes decimals with a comma.
 */
export function sanitizeAmountInput(text: string, previousRaw: string, signed = false): string {
  const shownBefore = formatAmountForInput(previousRaw);
  let value = text === shownBefore + ',' && !previousRaw.includes('.') ? previousRaw + '.' : text.replace(/,/g, '');
  const negative = signed && value.trim().startsWith('-');
  value = value.replace(/[^0-9.]/g, '');
  const dot = value.indexOf('.');
  if (dot !== -1) value = value.slice(0, dot + 1) + value.slice(dot + 1).replace(/\./g, '').slice(0, 2);
  if (value.startsWith('.')) value = '0' + value;
  value = value.replace(/^0+(?=\d)/, '');
  return (negative ? '-' : '') + value;
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
