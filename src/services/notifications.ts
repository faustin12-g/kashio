import * as Notifications from 'expo-notifications';

const ALERTS_CHANNEL = 'budget-alerts';
const REMINDERS_CHANNEL = 'reminders';
const DAILY_REMINDER_ID = 'daily-reminder';
let configured = false;

/**
 * One-time setup: how notifications behave while the app is open, and the
 * Android channels they are posted to. Safe to call more than once.
 */
export async function configureNotifications(): Promise<void> {
  if (configured) return;
  configured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  await Notifications.setNotificationChannelAsync(ALERTS_CHANNEL, {
    name: 'Budget alerts',
    description: 'Tells you when spending reaches a share of one of your budgets.',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
  await Notifications.setNotificationChannelAsync(REMINDERS_CHANNEL, {
    name: 'Reminders',
    description: 'Daily spending reminder and debt due dates.',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Makes sure the user has allowed notifications, asking once if they have
 * not been asked yet. Returns whether notifications can be shown.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Whether notifications are currently allowed, without asking. */
export async function hasNotificationPermission(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

/** Shows a notification right now. Returns false if it could not be shown. */
export async function showNotification(title: string, body: string): Promise<boolean> {
  if (!(await ensureNotificationPermission())) return false;
  await configureNotifications();
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { channelId: ALERTS_CHANNEL },
  });
  return true;
}

/** Replaces the repeating daily reminder. Returns false if notifications are not allowed. */
export async function scheduleDailyReminder(
  hour: number,
  minute: number,
  title: string,
  body: string
): Promise<boolean> {
  await cancelDailyReminder();
  if (!(await ensureNotificationPermission())) return false;
  await configureNotifications();
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: REMINDERS_CHANNEL,
    },
  });
  return true;
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
}

const debtReminderId = (debtId: string) => `debt:${debtId}`;

/** Schedules a one-off reminder for a debt's due date. A date in the past is ignored. */
export async function scheduleDebtReminder(
  debtId: string,
  when: Date,
  title: string,
  body: string
): Promise<void> {
  await cancelDebtReminder(debtId);
  if (when.getTime() <= Date.now()) return;
  if (!(await hasNotificationPermission())) return;
  await configureNotifications();
  await Notifications.scheduleNotificationAsync({
    identifier: debtReminderId(debtId),
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
      channelId: REMINDERS_CHANNEL,
    },
  });
}

export async function cancelDebtReminder(debtId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(debtReminderId(debtId));
}

const RECURRING_PREFIX = 'rec:';

export interface RecurringReminder {
  /** Unique per rule and occurrence, so the same one is never scheduled twice. */
  id: string;
  when: Date;
  title: string;
  body: string;
}

/**
 * Replaces every scheduled recurring-item reminder with the given ones. Past
 * times are ignored. Nothing is scheduled if notifications are not allowed.
 */
export async function replaceRecurringReminders(reminders: RecurringReminder[]): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.identifier.startsWith(RECURRING_PREFIX))
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier))
  );
  if (!(await hasNotificationPermission())) return;
  await configureNotifications();
  for (const reminder of reminders) {
    if (reminder.when.getTime() <= Date.now()) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: RECURRING_PREFIX + reminder.id,
      content: { title: reminder.title, body: reminder.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.when,
        channelId: REMINDERS_CHANNEL,
      },
    });
  }
}
