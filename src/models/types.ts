/**
 * Core domain types shared across the app.
 *
 * Money is always stored and passed around as an integer number of the
 * smallest currency unit (e.g. cents for USD, RWF has no minor unit so it
 * is stored 1:1) to avoid floating point rounding bugs. Use the helpers in
 * `src/utils/money.ts` to convert to/from a display string.
 */

export type EntryType = 'expense' | 'income';

export type BudgetPeriod = 'weekly' | 'monthly';

/** A spending/income category, e.g. "Groceries", "Salary". */
export interface Category {
  id: string;
  name: string;
  icon: string; // single emoji, keeps the app dependency-free for icon fonts
  color: string; // hex color used for charts and badges
  type: EntryType;
  isArchived: boolean;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
}

export type NewCategory = Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'> & {
  isArchived?: boolean;
};

/** A single money movement. */
export interface Transaction {
  id: string;
  amountMinor: number; // integer, smallest currency unit, always positive
  currency: string; // ISO 4217 code, e.g. "USD", "RWF"
  type: EntryType;
  categoryId: string | null; // null = uncategorized
  note: string;
  date: string; // ISO 8601 date (yyyy-MM-dd), the date the spend happened
  accountId: string | null; // which account the money moved in, if the user tracks accounts
  recurringId: string | null; // set when this was created automatically by a recurring rule
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null; // soft delete, kept for sync tombstones
}

export type NewTransaction = Omit<
  Transaction,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'accountId' | 'recurringId'
> & {
  accountId?: string | null;
  recurringId?: string | null;
};

/** A recurring spending limit, either overall or per category. */
export interface Budget {
  id: string;
  categoryId: string | null; // null = applies to overall spending
  amountLimitMinor: number;
  currency: string;
  period: BudgetPeriod;
  startDate: string; // ISO date the budget period anchors to
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export type NewBudget = Omit<Budget, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

/** Derived, not stored: how a budget is tracking for its current period. */
export interface BudgetProgress {
  budget: Budget;
  periodStart: string;
  periodEnd: string;
  spentMinor: number;
  remainingMinor: number;
  percentUsed: number; // 0-100+, can exceed 100 if over budget
}

/** Google account currently linked for Drive backup, or null if signed out. */
export interface DriveAccount {
  id: string;
  email: string;
  name: string | null;
  photoUrl: string | null;
}

export type SyncStatus = 'idle' | 'signed_out' | 'backing_up' | 'restoring' | 'error';

export interface SyncState {
  status: SyncStatus;
  account: DriveAccount | null;
  lastBackupAt: number | null;
  lastRestoreAt: number | null;
  lastError: string | null;
}

export type AccountType = 'cash' | 'bank' | 'mobile_money' | 'savings' | 'other';

/** A place money is kept: a wallet, a bank account, a mobile money account. */
export interface Account {
  id: string;
  name: string;
  type: AccountType;
  icon: string; // icon name
  color: string;
  openingBalanceMinor: number; // what it held when the user started tracking it; may be negative
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export type NewAccount = Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isArchived'> & {
  isArchived?: boolean;
};

/** Money moved between two of the user's own accounts. Not income and not spending. */
export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amountMinor: number;
  note: string;
  date: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export type NewTransfer = Omit<Transfer, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

/** A savings target, e.g. "New phone". */
export interface Goal {
  id: string;
  name: string;
  icon: string;
  color: string;
  targetMinor: number;
  deadline: string | null; // ISO date, optional
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export type NewGoal = Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

/** Money put towards a goal. Negative when money is taken back out. */
export interface GoalContribution {
  id: string;
  goalId: string;
  amountMinor: number;
  date: string;
  note: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export type NewGoalContribution = Omit<GoalContribution, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

export type DebtDirection = 'owed_to_me' | 'i_owe';

/** Money someone owes the user, or the user owes someone. */
export interface Debt {
  id: string;
  person: string;
  direction: DebtDirection;
  amountMinor: number;
  note: string;
  date: string; // when it was lent or borrowed
  dueDate: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export type NewDebt = Omit<Debt, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

/** A repayment made against a debt. */
export interface DebtPayment {
  id: string;
  debtId: string;
  amountMinor: number;
  date: string;
  note: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export type NewDebtPayment = Omit<DebtPayment, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

/** A rule that adds the same transaction on a schedule, e.g. rent on the 1st. */
export interface Recurring {
  id: string;
  type: EntryType;
  amountMinor: number;
  categoryId: string | null;
  accountId: string | null;
  note: string;
  frequency: RecurringFrequency;
  startDate: string; // the first occurrence; later ones are counted from here
  endDate: string | null;
  generatedCount: number; // how many occurrences have already been turned into transactions
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export type NewRecurring = Omit<
  Recurring,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'generatedCount' | 'isActive'
> & { isActive?: boolean };

/** Shape of the JSON file written to the user's Google Drive. */
export interface BackupPayload {
  schemaVersion: number;
  exportedAt: string; // ISO timestamp
  deviceName: string;
  /** The currency amounts are shown in. Added in schema 2. */
  currency?: string;
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  // Added in schema 2. Older backups simply do not have them.
  accounts?: Account[];
  transfers?: Transfer[];
  goals?: Goal[];
  goalContributions?: GoalContribution[];
  debts?: Debt[];
  debtPayments?: DebtPayment[];
  recurring?: Recurring[];
}
