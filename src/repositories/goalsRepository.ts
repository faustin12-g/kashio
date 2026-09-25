import type { SQLiteDatabase } from 'expo-sqlite';
import type { Goal, GoalContribution, NewGoal, NewGoalContribution } from '../models/types';
import { upsertRow } from '../db/upsert';
import { generateId } from '../utils/id';

interface GoalRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  target_minor: number;
  deadline: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

interface ContributionRow {
  id: string;
  goal_id: string;
  amount_minor: number;
  date: string;
  note: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

function goalFromRow(row: GoalRow): Goal {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    targetMinor: row.target_minor,
    deadline: row.deadline,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function contributionFromRow(row: ContributionRow): GoalContribution {
  return {
    id: row.id,
    goalId: row.goal_id,
    amountMinor: row.amount_minor,
    date: row.date,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export interface GoalWithProgress {
  goal: Goal;
  savedMinor: number;
}

export async function listGoals(db: SQLiteDatabase): Promise<GoalWithProgress[]> {
  const [goalRows, savedRows] = await Promise.all([
    db.getAllAsync<GoalRow>('SELECT * FROM goals WHERE deleted_at IS NULL ORDER BY created_at DESC'),
    db.getAllAsync<{ goal_id: string; saved: number }>(
      `SELECT goal_id, SUM(amount_minor) AS saved FROM goal_contributions
       WHERE deleted_at IS NULL GROUP BY goal_id`
    ),
  ]);
  const saved = new Map(savedRows.map((row) => [row.goal_id, row.saved]));
  return goalRows.map((row) => ({ goal: goalFromRow(row), savedMinor: saved.get(row.id) ?? 0 }));
}

export async function createGoal(db: SQLiteDatabase, input: NewGoal): Promise<Goal> {
  const now = Date.now();
  const goal: Goal = { id: generateId(), ...input, createdAt: now, updatedAt: now, deletedAt: null };
  await db.runAsync(
    `INSERT INTO goals (id, name, icon, color, target_minor, deadline, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    goal.id,
    goal.name,
    goal.icon,
    goal.color,
    goal.targetMinor,
    goal.deadline,
    goal.createdAt,
    goal.updatedAt
  );
  return goal;
}

export async function updateGoal(db: SQLiteDatabase, id: string, changes: Partial<NewGoal>): Promise<void> {
  const current = await db.getFirstAsync<GoalRow>('SELECT * FROM goals WHERE id = ? AND deleted_at IS NULL', id);
  if (!current) throw new Error(`Goal ${id} not found`);
  const next = { ...goalFromRow(current), ...changes };
  await db.runAsync(
    `UPDATE goals SET name = ?, icon = ?, color = ?, target_minor = ?, deadline = ?, updated_at = ? WHERE id = ?`,
    next.name,
    next.icon,
    next.color,
    next.targetMinor,
    next.deadline,
    Date.now(),
    id
  );
}

export async function deleteGoal(db: SQLiteDatabase, id: string): Promise<void> {
  const now = Date.now();
  await db.runAsync('UPDATE goals SET deleted_at = ?, updated_at = ? WHERE id = ?', now, now, id);
}

export async function listContributions(db: SQLiteDatabase, goalId: string): Promise<GoalContribution[]> {
  const rows = await db.getAllAsync<ContributionRow>(
    'SELECT * FROM goal_contributions WHERE goal_id = ? AND deleted_at IS NULL ORDER BY date DESC, created_at DESC',
    goalId
  );
  return rows.map(contributionFromRow);
}

export async function addContribution(
  db: SQLiteDatabase,
  input: NewGoalContribution
): Promise<GoalContribution> {
  const now = Date.now();
  const contribution: GoalContribution = {
    id: generateId(),
    ...input,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await db.runAsync(
    `INSERT INTO goal_contributions (id, goal_id, amount_minor, date, note, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
    contribution.id,
    contribution.goalId,
    contribution.amountMinor,
    contribution.date,
    contribution.note,
    contribution.createdAt,
    contribution.updatedAt
  );
  return contribution;
}

export async function deleteContribution(db: SQLiteDatabase, id: string): Promise<void> {
  const now = Date.now();
  await db.runAsync('UPDATE goal_contributions SET deleted_at = ?, updated_at = ? WHERE id = ?', now, now, id);
}

export async function listAllGoalsForBackup(db: SQLiteDatabase): Promise<Goal[]> {
  const rows = await db.getAllAsync<GoalRow>('SELECT * FROM goals');
  return rows.map(goalFromRow);
}

export async function listAllContributionsForBackup(db: SQLiteDatabase): Promise<GoalContribution[]> {
  const rows = await db.getAllAsync<ContributionRow>('SELECT * FROM goal_contributions');
  return rows.map(contributionFromRow);
}

export async function upsertGoalFromBackup(db: SQLiteDatabase, goal: Goal): Promise<void> {
  await upsertRow(db, 'goals', {
    id: goal.id,
    name: goal.name,
    icon: goal.icon,
    color: goal.color,
    target_minor: goal.targetMinor,
    deadline: goal.deadline,
    created_at: goal.createdAt,
    updated_at: goal.updatedAt,
    deleted_at: goal.deletedAt,
  });
}

export async function upsertContributionFromBackup(
  db: SQLiteDatabase,
  contribution: GoalContribution
): Promise<void> {
  await upsertRow(db, 'goal_contributions', {
    id: contribution.id,
    goal_id: contribution.goalId,
    amount_minor: contribution.amountMinor,
    date: contribution.date,
    note: contribution.note,
    created_at: contribution.createdAt,
    updated_at: contribution.updatedAt,
    deleted_at: contribution.deletedAt,
  });
}
