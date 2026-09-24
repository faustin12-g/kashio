export interface CurrencyOption {
  code: string;
  label: string;
}

/** A curated shortlist rather than the full ISO 4217 table — easy to extend. */
export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'USD', label: 'US Dollar' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'British Pound' },
  { code: 'RWF', label: 'Rwandan Franc' },
  { code: 'KES', label: 'Kenyan Shilling' },
  { code: 'UGX', label: 'Ugandan Shilling' },
  { code: 'TZS', label: 'Tanzanian Shilling' },
  { code: 'NGN', label: 'Nigerian Naira' },
  { code: 'ZAR', label: 'South African Rand' },
  { code: 'INR', label: 'Indian Rupee' },
  { code: 'CNY', label: 'Chinese Yuan' },
  { code: 'JPY', label: 'Japanese Yen' },
  { code: 'CAD', label: 'Canadian Dollar' },
  { code: 'AUD', label: 'Australian Dollar' },
];
