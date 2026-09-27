import type { SQLiteDatabase } from 'expo-sqlite';
import type { NotificationKind, NotificationLogEntry } from '../models/types';
import { generateId } from '../utils/id';

interface NotificationLogRow {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  route: string | null;
  created_at: number;
  read_at: number | null;
}

function fromRow(row: NotificationLogRow): NotificationLogEntry {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    route: row.route,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

/** Most recent first. Kept local to the device — not part of the Drive backup. */
export async function listNotifications(db: SQLiteDatabase, limit = 200): Promise<NotificationLogEntry[]> {
  const rows = await db.getAllAsync<NotificationLogRow>(
    'SELECT * FROM notification_log ORDER BY created_at DESC LIMIT ?',
    limit
  );
  return rows.map(fromRow);
}

export async function countUnreadNotifications(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM notification_log WHERE read_at IS NULL'
  );
  return row?.total ?? 0;
}

export interface NewNotificationLogEntry {
  kind: NotificationKind;
  title: string;
  body: string;
  route?: string | null;
}

/**
 * Records that Kashio sent a notification, so the Notifications screen has
 * something to show. Pass `options.id` (e.g. the OS notification's own
 * identifier) to make logging it twice a no-op instead of a duplicate row.
 */
export async function logNotification(
  db: SQLiteDatabase,
  entry: NewNotificationLogEntry,
  options: { id?: string } = {}
): Promise<void> {
  await db.runAsync(
    'INSERT OR IGNORE INTO notification_log (id, kind, title, body, route, created_at, read_at) VALUES (?, ?, ?, ?, ?, ?, NULL)',
    options.id ?? generateId(),
    entry.kind,
    entry.title,
    entry.body,
    entry.route ?? null,
    Date.now()
  );
}

export async function markNotificationRead(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('UPDATE notification_log SET read_at = ? WHERE id = ? AND read_at IS NULL', Date.now(), id);
}

export async function markAllNotificationsRead(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('UPDATE notification_log SET read_at = ? WHERE read_at IS NULL', Date.now());
}

/** Keeps the table from growing forever — called occasionally at startup. */
export async function pruneOldNotifications(db: SQLiteDatabase, keep = 200): Promise<void> {
  await db.runAsync(
    'DELETE FROM notification_log WHERE id NOT IN (SELECT id FROM notification_log ORDER BY created_at DESC LIMIT ?)',
    keep
  );
}

/** Empties the notification history. This is a hard delete: there is nothing to sync or restore. */
export async function clearAllNotifications(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM notification_log');
}
