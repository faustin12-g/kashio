import type { IconName } from '../components/Icon';
import type { AccountType } from '../models/types';

/** The icon and colour each kind of account gets. */
export const ACCOUNT_TYPE_STYLE: Record<AccountType, { icon: IconName; color: string }> = {
  cash: { icon: 'cash', color: '#16A34A' },
  bank: { icon: 'bank-outline', color: '#3B82F6' },
  mobile_money: { icon: 'cellphone', color: '#F59E0B' },
  savings: { icon: 'piggy-bank-outline', color: '#A855F7' },
  other: { icon: 'wallet-outline', color: '#64748B' },
};

export const ACCOUNT_TYPES: AccountType[] = ['cash', 'mobile_money', 'bank', 'savings', 'other'];
