import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useCategoriesStore } from '../store/categoriesStore';
import { useSettingsStore } from '../store/settingsStore';
import { useSyncStore } from '../store/syncStore';
import { useTheme } from '../constants/theme';
import { Logo } from './Logo';

/**
 * Runs once, after the database connection is ready: loads categories and
 * settings so every screen has them immediately, and tries to silently
 * restore a previous Google sign-in (no UI shown, just a background check).
 * Renders nothing itself until that's done, so screens never see empty
 * store state on first paint.
 */
export function AppInitializer({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [ready, setReady] = useState(false);

  const loadCategories = useCategoriesStore((state) => state.load);
  const loadSettings = useSettingsStore((state) => state.load);
  const initSync = useSyncStore((state) => state.init);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadCategories(db), loadSettings(db), initSync(db)]).finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // Intentionally run once per database instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

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
