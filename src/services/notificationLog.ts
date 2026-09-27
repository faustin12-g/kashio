import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { NotificationKind } from '../models/types';
import { logNotification, pruneOldNotifications } from '../repositories/notificationLogRepository';
import { todayIso } from '../utils/date';

function isNotificationKind(value: unknown): value is NotificationKind {
  return value === 'budget' || value === 'recurring' || value === 'reminder' || value === 'debt';
}

async function logDelivered(
  db: SQLiteDatabase,
  identifier: string,
  content: { title?: string | null; body?: string | null; data?: unknown }
): Promise<void> {
  const data = content.data as { kind?: unknown; route?: unknown } | undefined;
  const kind = isNotificationKind(data?.kind) ? data.kind : 'reminder';
  // The daily reminder reuses one identifier for every day it fires, so the
  // dedupe key also needs today's date — otherwise only its first-ever
  // firing would ever be logged. One-off notifications just get a harmless,
  // always-unique date suffix.
  await logNotification(
    db,
    { kind, title: content.title ?? '', body: content.body ?? '', route: typeof data?.route === 'string' ? data.route : null },
    { id: `${identifier}:${todayIso()}` }
  );
}

/**
 * Keeps the in-app "Notifications" history in step with what Kashio actually
 * sends. Two paths feed it, together covering the app being open and closed:
 * - a listener, for anything delivered while the app process is alive;
 * - a one-off catch-up at start-up, for anything that arrived while the app
 *   was fully closed and is still sitting in the notification shade.
 * Both write with the notification's own identifier as the row id, so the
 * two paths can never log the same notification twice.
 */
export function watchDeliveredNotifications(db: SQLiteDatabase, onLogged?: () => void): () => void {
  const subscription = Notifications.addNotificationReceivedListener((event) => {
    void logDelivered(db, event.request.identifier, event.request.content).then(onLogged);
  });
  return () => subscription.remove();
}

/** Best-effort catch-up for notifications delivered while the app was closed. Call once at start-up. */
export async function reconcilePresentedNotifications(db: SQLiteDatabase): Promise<void> {
  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    for (const notification of presented) {
      await logDelivered(db, notification.request.identifier, notification.request.content);
    }
    await pruneOldNotifications(db);
  } catch (error) {
    console.warn('Could not reconcile presented notifications', error);
  }
}
