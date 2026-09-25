import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import { useSQLiteContext } from 'expo-sqlite';
import { useAccountsStore } from '../store/accountsStore';
import { useCategoriesStore } from '../store/categoriesStore';
import { useRecurringStore } from '../store/recurringStore';
import { useSettingsStore } from '../store/settingsStore';
import { useSyncStore } from '../store/syncStore';
import { FONT_FILES } from '../constants/fonts';
import { useTheme } from '../constants/theme';
import { countTransactions } from '../repositories/transactionsRepository';
import { registerAutoBackupTask, runAutoBackupIfDue } from '../services/autoBackup';
import { configureNotifications } from '../services/notifications';
import { syncDailyReminder } from '../services/reminders';
import { Logo } from './Logo';

/**
 * Runs once, after the database connection is ready: loads categories and
 * settings so every screen has them immediately, restores a previous Google
 * sign-in (no UI shown), and does the housekeeping that has to happen on each
 * start: loading recurring items (and re-arming their reminders), re-arming
 * the daily reminder, and catching up on an automatic backup. Renders nothing itself
 * until the essentials are loaded, so screens never see empty store state on
 * first paint.
 */
export function AppInitializer({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [started, setStarted] = useState(false);
  // Fonts are decoration: if they fail to load the system font is used and the app starts anyway.
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  const ready = started && (fontsLoaded || fontError !== null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      await Promise.all([
        useCategoriesStore.getState().load(db),
        useSettingsStore.getState().load(db),
        useSyncStore.getState().init(db),
        configureNotifications(),
      ]);

      const settings = useSettingsStore.getState();
      // People updating from an older version already have data: no welcome tour for them.
      if (!settings.onboardingDone && (await countTransactions(db)) > 0) {
        await settings.completeOnboarding(db);
      }

      await Promise.all([useAccountsStore.getState().load(db), useRecurringStore.getState().load(db)]);
    }

    start()
      .catch((error) => console.warn('App startup task failed', error))
      .finally(() => {
        if (!cancelled) setStarted(true);
      });

    return () => {
      cancelled = true;
    };
  }, [db]);

  // Background housekeeping that must not delay the first screen.
  useEffect(() => {
    if (!ready) return;
    const settings = useSettingsStore.getState();
    syncDailyReminder(settings.reminderEnabled, settings.reminderTime).catch(() => undefined);
    if (settings.autoBackupEnabled) {
      registerAutoBackupTask().catch(() => undefined);
      void runAutoBackupIfDue(db);
    }
  }, [ready, db]);

  if (!ready) {
    return (
      <View style={[styles.fallback, { backgroundColor: theme.background }]}>
        <Logo size={96} />
        <ActivityIndicator color={theme.primary} style={styles.spinner} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  spinner: { marginTop: 24 },
});
