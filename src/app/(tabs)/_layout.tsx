import React from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { useTheme } from '../../constants/theme';

const ICONS: Record<string, string> = {
  index: '🏠',
  transactions: '💳',
  budgets: '🎯',
  settings: '⚙️',
};

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        tabBarIcon: () => <Text style={{ fontSize: 20 }}>{ICONS[route.name] ?? '•'}</Text>,
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', headerTitle: 'Buget' }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transactions' }} />
      <Tabs.Screen name="budgets" options={{ title: 'Budgets' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
