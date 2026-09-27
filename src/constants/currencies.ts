export interface CurrencyOption {
  code: string;
  label: string;
}

/**
 * The currencies this app's users actually need: Rwanda plus its
 * neighbours, plus the two most common international ones. Not the full
 * ISO 4217 table — easy to extend later if that changes.
 */
export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'RWF', label: 'Rwandan Franc' },
  { code: 'USD', label: 'US Dollar' },
  { code: 'EUR', label: 'Euro' },
  { code: 'KES', label: 'Kenyan Shilling' },
  { code: 'UGX', label: 'Ugandan Shilling' },
  { code: 'TZS', label: 'Tanzanian Shilling' },
  { code: 'BIF', label: 'Burundian Franc' },
  { code: 'CDF', label: 'Congolese Franc' },
];
