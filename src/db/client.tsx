import React, { Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { runMigrations } from './migrations';
import { seedDefaultCategories } from './seed';

export const DATABASE_NAME = 'buget.db';

/** Runs on first open of the database connection, before any screen renders. */
async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await runMigrations(db);
  await seedDefaultCategories(db);
}

function DatabaseLoadingFallback() {
  return (
    <View style={styles.fallback}>
      <ActivityIndicator />
    </View>
  );
}

/**
 * Wraps the app in a single shared SQLite connection, opened and migrated
 * once before anything else renders. Any descendant screen can read it with
 * `useSQLiteContext()` from `expo-sqlite`.
 */
export function AppDatabaseProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<DatabaseLoadingFallback />}>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={initializeDatabase} useSuspense>
        {children}
      </SQLiteProvider>
    </Suspense>
  );
}

const styles = StyleSheet.create({
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
