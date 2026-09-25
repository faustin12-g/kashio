import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppDatabaseProvider } from '../db/client';
import { AppInitializer } from '../components/AppInitializer';
import { LockGate } from '../components/LockGate';
import { useTheme } from '../constants/theme';
import { useSettingsStore } from '../store/settingsStore';
// Defines the background backup job; Android may start the app just to run it.
import '../services/autoBackupTask';

function Navigation() {
  const theme = useTheme();
  const onboardingDone = useSettingsStore((state) => state.onboardingDone);

  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Protected guard={!onboardingDone}>
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={onboardingDone}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="transactions/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="transactions/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="budgets/new" options={{ presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppDatabaseProvider>
      <AppInitializer>
        <LockGate>
          <Navigation />
        </LockGate>
      </AppInitializer>
    </AppDatabaseProvider>
  );
}
