/**
 * Core domain types shared across the app.
 *
 * Money is always stored and passed around as an integer number of the
 * smallest currency unit (e.g. cents for USD, RWF has no minor unit so it
 * is stored 1:1) to avoid floating point rounding bugs. Use the helpers in
 * `src/utils/money.ts` to convert to/from a display string.
 */

export type EntryType = 'expense' | 'income';

export type BudgetPeriod = 'weekly' | 'monthly' | 'once';

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
  recurringId: string | null; // set when this was created automatically by a recurring rule
  /** True for the one entry that records "money I already had" when tracking started. */
  isOpeningBalance: boolean;
  /** Local file path to a photo of the receipt, if one was attached. Not guaranteed to exist on another device. */
  receiptUri: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null; // soft delete, kept for sync tombstones
}

export type NewTransaction = Omit<
  Transaction,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'recurringId' | 'isOpeningBalance' | 'receiptUri'
> & {
  recurringId?: string | null;
  isOpeningBalance?: boolean;
  receiptUri?: string | null;
};

/** A spending limit: either resetting every week/month, or a one-time cap that never resets. */
export interface Budget {
  id: string;
  categoryId: string | null; // null = applies to overall spending
  amountLimitMinor: number;
  currency: string;
  period: BudgetPeriod;
  startDate: string; // ISO date the budget period anchors to (or simply began, for "once")
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export type NewBudget = Omit<Budget, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

/** Derived, not stored: how a budget is tracking for its current period. */
export interface BudgetProgress {
  budget: Budget;
  periodStart: string;
  periodEnd: string | null; // null for a "once" budget: it never ends on its own
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

/** Kinds of thing Kashio can log to the in-app notification history. */
export type NotificationKind = 'budget' | 'recurring' | 'reminder' | 'debt';

/** One notification Kashio has sent, kept locally so "Notifications" has something to show. Not synced to Drive. */
export interface NotificationLogEntry {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Where tapping it should go, e.g. "/budgets". Optional. */
  route: string | null;
  createdAt: number;
  readAt: number | null;
}

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
  goals?: Goal[];
  goalContributions?: GoalContribution[];
  debts?: Debt[];
  debtPayments?: DebtPayment[];
  recurring?: Recurring[];
}
