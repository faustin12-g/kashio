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
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null; // soft delete, kept for sync tombstones
}

export type NewTransaction = Omit<
  Transaction,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

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

/** Shape of the JSON file written to the user's Google Drive. */
export interface BackupPayload {
  schemaVersion: number;
  exportedAt: string; // ISO timestamp
  deviceName: string;
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
}
