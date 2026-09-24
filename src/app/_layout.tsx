import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppDatabaseProvider } from '../db/client';
import { AppInitializer } from '../components/AppInitializer';
import { useTheme } from '../constants/theme';

function Navigation() {
  const theme = useTheme();

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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="transactions/new" options={{ title: 'New transaction', presentation: 'modal' }} />
        <Stack.Screen name="transactions/[id]" options={{ title: 'Edit transaction', presentation: 'modal' }} />
        <Stack.Screen name="categories/index" options={{ title: 'Categories' }} />
        <Stack.Screen name="budgets/new" options={{ title: 'New budget', presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppDatabaseProvider>
      <AppInitializer>
        <Navigation />
      </AppInitializer>
    </AppDatabaseProvider>
  );
}
