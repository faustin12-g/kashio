import type { SQLiteDatabase } from 'expo-sqlite';
import type { Debt, DebtPayment, NewDebt, NewDebtPayment } from '../models/types';
import { upsertRow } from '../db/upsert';
import { generateId } from '../utils/id';

interface DebtRow {
  id: string;
  person: string;
  direction: Debt['direction'];
  amount_minor: number;
  note: string;
  date: string;
  due_date: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

interface PaymentRow {
  id: string;
  debt_id: string;
  amount_minor: number;
  date: string;
  note: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

function debtFromRow(row: DebtRow): Debt {
  return {
    id: row.id,
    person: row.person,
    direction: row.direction,
    amountMinor: row.amount_minor,
    note: row.note,
    date: row.date,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function paymentFromRow(row: PaymentRow): DebtPayment {
  return {
    id: row.id,
    debtId: row.debt_id,
    amountMinor: row.amount_minor,
    date: row.date,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export interface DebtWithPayments {
  debt: Debt;
  paidMinor: number;
}

export async function listDebts(db: SQLiteDatabase): Promise<DebtWithPayments[]> {
  const [debtRows, paidRows] = await Promise.all([
    db.getAllAsync<DebtRow>('SELECT * FROM debts WHERE deleted_at IS NULL ORDER BY date DESC, created_at DESC'),
    db.getAllAsync<{ debt_id: string; paid: number }>(
      `SELECT debt_id, SUM(amount_minor) AS paid FROM debt_payments
       WHERE deleted_at IS NULL GROUP BY debt_id`
    ),
  ]);
  const paid = new Map(paidRows.map((row) => [row.debt_id, row.paid]));
  return debtRows.map((row) => ({ debt: debtFromRow(row), paidMinor: paid.get(row.id) ?? 0 }));
}

export async function createDebt(db: SQLiteDatabase, input: NewDebt): Promise<Debt> {
  const now = Date.now();
  const debt: Debt = { id: generateId(), ...input, createdAt: now, updatedAt: now, deletedAt: null };
  await db.runAsync(
    `INSERT INTO debts (id, person, direction, amount_minor, note, date, due_date, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    debt.id,
    debt.person,
    debt.direction,
    debt.amountMinor,
    debt.note,
    debt.date,
    debt.dueDate,
    debt.createdAt,
    debt.updatedAt
  );
  return debt;
}

export async function updateDebt(db: SQLiteDatabase, id: string, changes: Partial<NewDebt>): Promise<void> {
  const current = await db.getFirstAsync<DebtRow>('SELECT * FROM debts WHERE id = ? AND deleted_at IS NULL', id);
  if (!current) throw new Error(`Debt ${id} not found`);
  const next = { ...debtFromRow(current), ...changes };
  await db.runAsync(
    `UPDATE debts SET person = ?, direction = ?, amount_minor = ?, note = ?, date = ?, due_date = ?, updated_at = ?
     WHERE id = ?`,
    next.person,
    next.direction,
    next.amountMinor,
    next.note,
    next.date,
    next.dueDate,
    Date.now(),
    id
  );
}

export async function deleteDebt(db: SQLiteDatabase, id: string): Promise<void> {
  const now = Date.now();
  await db.runAsync('UPDATE debts SET deleted_at = ?, updated_at = ? WHERE id = ?', now, now, id);
}

export async function listPayments(db: SQLiteDatabase, debtId: string): Promise<DebtPayment[]> {
  const rows = await db.getAllAsync<PaymentRow>(
    'SELECT * FROM debt_payments WHERE debt_id = ? AND deleted_at IS NULL ORDER BY date DESC, created_at DESC',
    debtId
  );
  return rows.map(paymentFromRow);
}

export async function addPayment(db: SQLiteDatabase, input: NewDebtPayment): Promise<DebtPayment> {
  const now = Date.now();
  const payment: DebtPayment = { id: generateId(), ...input, createdAt: now, updatedAt: now, deletedAt: null };
  await db.runAsync(
    `INSERT INTO debt_payments (id, debt_id, amount_minor, date, note, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
    payment.id,
    payment.debtId,
    payment.amountMinor,
    payment.date,
    payment.note,
    payment.createdAt,
    payment.updatedAt
  );
  return payment;
}

export async function deletePayment(db: SQLiteDatabase, id: string): Promise<void> {
  const now = Date.now();
  await db.runAsync('UPDATE debt_payments SET deleted_at = ?, updated_at = ? WHERE id = ?', now, now, id);
}

export async function listAllDebtsForBackup(db: SQLiteDatabase): Promise<Debt[]> {
  const rows = await db.getAllAsync<DebtRow>('SELECT * FROM debts');
  return rows.map(debtFromRow);
}

export async function listAllPaymentsForBackup(db: SQLiteDatabase): Promise<DebtPayment[]> {
  const rows = await db.getAllAsync<PaymentRow>('SELECT * FROM debt_payments');
  return rows.map(paymentFromRow);
}

export async function upsertDebtFromBackup(db: SQLiteDatabase, debt: Debt): Promise<void> {
  await upsertRow(db, 'debts', {
    id: debt.id,
    person: debt.person,
    direction: debt.direction,
    amount_minor: debt.amountMinor,
    note: debt.note,
    date: debt.date,
    due_date: debt.dueDate,
    created_at: debt.createdAt,
    updated_at: debt.updatedAt,
    deleted_at: debt.deletedAt,
  });
}

export async function upsertPaymentFromBackup(db: SQLiteDatabase, payment: DebtPayment): Promise<void> {
  await upsertRow(db, 'debt_payments', {
    id: payment.id,
    debt_id: payment.debtId,
    amount_minor: payment.amountMinor,
    date: payment.date,
    note: payment.note,
    created_at: payment.createdAt,
    updated_at: payment.updatedAt,
    deleted_at: payment.deletedAt,
  });
}
